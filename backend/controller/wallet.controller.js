import Worker from "../models/Worker.js";
import Settlement from "../models/Settlement.js";
import Farmer from "../models/Farmer.js";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /settlement/worker/:workerId/wallet-withdraw
export const withdrawFromWallet = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: "Invalid withdraw amount" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (worker.walletBalance < amount) {
      return res.status(400).json({ msg: "Insufficient wallet balance" });
    }

    // deduct wallet
    worker.walletBalance -= amount;
    await worker.save();

    // record settlement entry
    await Settlement.create({
      workerId,
      farmerId: req.user.id,
      startDate: new Date(),
      endDate: new Date(),
      attendanceTotal: 0,
      advancesTotal: 0,
      extrasTotal: 0,
      netAmount: -amount,
      paidAmount: 0, // Don't set paidAmount for wallet operations
      walletDeposit: -amount,
      note: note || "Wallet withdrawal",
    });

    return res.status(201).json({
      msg: "Wallet withdrawal successful",
      walletBalance: worker.walletBalance,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Wallet withdrawal failed" });
  }
};

// POST /settlement/worker/:workerId/wallet-deposit
export const depositToWallet = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: "Invalid deposit amount" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // add to wallet
    worker.walletBalance += amount;
    await worker.save();

    // record settlement entry
    await Settlement.create({
      workerId,
      farmerId: req.user.id,
      startDate: new Date(),
      endDate: new Date(),
      attendanceTotal: 0,
      advancesTotal: 0,
      extrasTotal: 0,
      netAmount: amount,
      paidAmount: 0,
      walletDeposit: amount,
      note: note || "Wallet deposit",
    });

    return res.status(201).json({
      msg: "Wallet deposit successful",
      walletBalance: worker.walletBalance,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Wallet deposit failed" });
  }
};

// GET /settlement/worker/:workerId/wallet-statement-pdf
export const generateWalletStatementPDF = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const farmer = await Farmer.findById(req.user.id);

    // Fetch all settlements with wallet transactions
    const settlements = await Settlement.find({
      workerId,
      walletDeposit: { $ne: 0 },
    })
      .sort({ createdAt: 1 })
      .lean();

    const entries = [];
    let runningBalance = 0;

    settlements.forEach((st) => {
      if (st.walletDeposit > 0) {
        // Deposit
        runningBalance += st.walletDeposit;
        entries.push({
          date: st.createdAt,
          type: "deposit",
          description: st.note || "Wallet deposit",
          amount: st.walletDeposit,
          balance: runningBalance,
        });
      } else if (st.walletDeposit < 0) {
        // Withdraw
        runningBalance += st.walletDeposit; // walletDeposit is negative
        entries.push({
          date: st.createdAt,
          type: "withdraw",
          description: st.note || "Wallet withdrawal",
          amount: Math.abs(st.walletDeposit),
          balance: runningBalance,
        });
      }
    });

    // Generate PDF
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=wallet-statement-${worker.name}.pdf`,
      );
      res.send(pdfData);
    });

    const fontPath = path.join(
      process.cwd(),
      "assets/fonts/NotoSans-VariableFont_wdth,wght.ttf",
    );
    doc.registerFont("NotoSans", fontPath);
    doc.font("NotoSans");

    // Logo
    const logoPath = path.resolve(
      __dirname,
      "..", // controller → backend
      "..", // backend → root
      "wms-frontend",
      "public",
      "icon-192.png",
    );

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { width: 60 });
    }

    let y = 120; // Start after logo

    // Header
    doc.fillColor("#111827");
    doc
      .fontSize(22)
      .font("NotoSans")
      .text("WALLET STATEMENT", 50, y, { align: "center", width: 500 });

    y += 30;
    doc
      .fontSize(11)
      .fillColor("#4b5563")
      .text("Safekeeping & Transactions", 50, y, {
        align: "center",
        width: 500,
      });

    y += 30;
    const leftX = 50;
    const rightX = 330;

    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(`Worker Name : ${worker.name}`, leftX, y)
      .text(`Farmer Name : ${farmer.name}`, leftX, y + 16);

    doc
      .text(
        `Generated : ${new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        rightX,
        y,
      )
      .text(`Current Balance : ₹${worker.walletBalance || 0}`, rightX, y + 16);

    y += 40;
    doc.strokeColor("#9ca3af").moveTo(50, y).lineTo(550, y).stroke();

    // Current Balance Badge
    y += 10;
    const badgeWidth = 200;
    const badgeHeight = 42;
    const badgeX = 350;

    doc
      .roundedRect(badgeX, y, badgeWidth, badgeHeight, 8)
      .fillAndStroke("#ecfdf5", "#10b981");

    doc
      .fillColor("#065f46")
      .fontSize(10)
      .text("CURRENT BALANCE", badgeX + 12, y + 8);

    doc
      .fontSize(16)
      .font("NotoSans")
      .text(`₹ ${worker.walletBalance || 0}`, badgeX + 12, y + 20);

    doc.fillColor("black");

    y += badgeHeight + 20;

    // Table Headers
    doc.fontSize(10).fillColor("#111827");
    doc.text("Date", 50, y);
    doc.text("Type", 120, y);
    doc.text("Description", 190, y);
    doc.text("Amount", 400, y, { width: 60, align: "right" });
    doc.text("Balance", 480, y, { width: 60, align: "right" });

    y += 15;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Entries
    if (entries.length === 0) {
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("No wallet transactions yet", 50, y, { align: "center" });
    } else {
      entries.forEach((entry) => {
        const dateStr = new Date(entry.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const isDeposit = entry.type === "deposit";

        // Truncate long descriptions
        let description = entry.description;
        if (description.length > 35) {
          description = description.substring(0, 32) + "...";
        }

        // Color coding
        if (isDeposit) {
          doc.fillColor("#10b981"); // emerald for deposits
        } else {
          doc.fillColor("#ef4444"); // red for withdrawals
        }

        doc.text(dateStr, 50, y);
        doc.text(isDeposit ? "Deposit" : "Withdraw", 120, y);
        doc.fillColor("#111827");
        doc.text(description, 190, y, { width: 200 });

        if (isDeposit) {
          doc.fillColor("#10b981");
          doc.text(`+₹${entry.amount}`, 400, y, { width: 60, align: "right" });
        } else {
          doc.fillColor("#ef4444");
          doc.text(`-₹${entry.amount}`, 400, y, { width: 60, align: "right" });
        }

        doc.fillColor("#111827");
        doc.text(`₹${entry.balance}`, 480, y, { width: 60, align: "right" });

        y += 20;

        // Check if we need a new page
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });
    }

    // Footer note
    y += 20;
    doc.fontSize(9).fillColor("#6b7280");
    doc.text(
      "This statement shows all deposits and withdrawals from the worker's wallet.",
      50,
      y,
      { width: 500, align: "center" },
    );

    doc.end();
  } catch (error) {
    console.error("Error generating wallet statement PDF:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      msg: "Error generating wallet statement",
      error: error.message,
    });
  }
};
