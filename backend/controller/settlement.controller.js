import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Extra from "../models/Extra.js";
import Settlement from "../models/Settlement.js";
import PDFDocument from "pdfkit";
import Farmer from "../models/Farmer.js";
import path from "path";

// helper → ALWAYS send date-only string (no timezone bugs)
const toDateOnly = (date) => (date ? date.toISOString().split("T")[0] : null);

export const getWorkerPendingSummary = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Fetch all UNSETTLED entries
    const [attendance, advances, extras] = await Promise.all([
      Attendance.find({ workerId, isSettled: false }).lean(),
      Advance.find({ workerId, isSettled: false }).lean(),
      Extra.find({ workerId, isSettled: false }).lean(),
    ]);

    // Amounts
    const attendanceTotal = attendance.reduce((s, a) => s + (a.total || 0), 0);
    const advancesTotal = advances.reduce((s, a) => s + (a.amount || 0), 0);
    const extrasTotal = extras.reduce((s, e) => s + (e.price || 0), 0);

    const netPending = attendanceTotal - advancesTotal - extrasTotal;

    // 👉 DATE-ONLY collection (THIS FIXES EVERYTHING)
    const pendingDates = [
      ...attendance.map((a) => a.date),
      ...advances.map((a) => a.date),
      ...extras.map((e) => e.date),
    ]
      .filter(Boolean)
      .map((d) => d.toISOString().split("T")[0]); // YYYY-MM-DD

    const suggestedStartDate = pendingDates.length
      ? pendingDates.reduce((a, b) => (a < b ? a : b))
      : null;

    const suggestedEndDate = pendingDates.length
      ? pendingDates.reduce((a, b) => (a > b ? a : b))
      : null;

    // Last settlement info (optional, informational only)
    const lastSettlement = await Settlement.findOne({ workerId })
      .sort({ endDate: -1 })
      .select("endDate")
      .lean();

    return res.status(200).json({
      msg: "Worker pending summary fetched",
      worker: {
        _id: worker._id,
        name: worker.name,
      },
      amounts: {
        attendanceTotal,
        advancesTotal,
        extrasTotal,
        netPending,
      },
      lastSettledTill: lastSettlement
        ? lastSettlement.endDate.toISOString().split("T")[0]
        : null,
      suggestedStartDate,
      suggestedEndDate,
    });
  } catch (err) {
    console.error("getWorkerPendingSummary error:", err);
    return res
      .status(500)
      .json({ msg: "Error in getting worker pending summary" });
  }
};

export const createSettlementForWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, note } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Fetch ALL unsettled entries
    const [attendance, advances, extras] = await Promise.all([
      Attendance.find({ workerId, isSettled: false }).lean(),
      Advance.find({ workerId, isSettled: false }).lean(),
      Extra.find({ workerId, isSettled: false }).lean(),
    ]);

    if (!attendance.length && !advances.length && !extras.length) {
      return res.status(400).json({ msg: "No pending entries to settle" });
    }

    // Date-only comparison (CRITICAL)
    const pendingDates = [
      ...attendance.map((a) => a.date),
      ...advances.map((a) => a.date),
      ...extras.map((e) => e.date),
    ]
      .filter(Boolean)
      .map((d) => d.toISOString().split("T")[0]);

    const earliest = pendingDates.reduce((a, b) => (a < b ? a : b));
    const latest = pendingDates.reduce((a, b) => (a > b ? a : b));

    if (startDate !== earliest) {
      return res.status(400).json({
        msg: `Settlement must start from ${earliest}`,
      });
    }

    if (endDate !== latest) {
      return res.status(400).json({
        msg: `Settlement must end on ${latest}`,
      });
    }

    // Amounts
    const attendanceTotal = attendance.reduce((s, a) => s + (a.total || 0), 0);
    const advancesTotal = advances.reduce((s, a) => s + (a.amount || 0), 0);
    const extrasTotal = extras.reduce((s, e) => s + (e.price || 0), 0);

    const netAmount = attendanceTotal - advancesTotal - extrasTotal;

    // Persist settlement
    const settlement = await Settlement.create({
      workerId,
      farmerId: req.user.id,
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      endDate: new Date(`${endDate}T23:59:59.999Z`),
      attendanceTotal,
      advancesTotal,
      extrasTotal,
      netAmount,
      note: note || "",
    });

    // Mark all as settled
    await Promise.all([
      Attendance.updateMany(
        { _id: { $in: attendance.map((a) => a._id) } },
        { isSettled: true, settlementId: settlement._id }
      ),
      Advance.updateMany(
        { _id: { $in: advances.map((a) => a._id) } },
        { isSettled: true, settlementId: settlement._id }
      ),
      Extra.updateMany(
        { _id: { $in: extras.map((e) => e._id) } },
        { isSettled: true, settlementId: settlement._id }
      ),
    ]);

    return res.status(201).json({ msg: "Settlement created successfully" });
  } catch (err) {
    console.error("createSettlementForWorker error:", err);
    return res.status(500).json({ msg: "Error in creating settlement" });
  }
};

// ✅ 3. Get settlement history for a worker (for Summary tab or worker popup)
export const getWorkerSettlements = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }
    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const settlements = await Settlement.find({ workerId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      msg: "Worker settlements fetched",
      settlements,
    });
  } catch (error) {
    console.log("Error in getWorkerSettlements", error);
    return res.status(500).json({ msg: "Error in getting worker settlements" });
  }
};

// ✅ 4. Get ALL settlements of this farmer (Summary tab – History)
export const getFarmerSettlementsHistory = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const settlements = await Settlement.find({ farmerId })
      .populate("workerId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      msg: "Farmer settlements history fetched",
      settlements,
    });
  } catch (error) {
    console.log("Error in getFarmerSettlementsHistory", error);
    return res
      .status(500)
      .json({ msg: "Error in getting settlements history" });
  }
};

// ✅ 4. Full worker ledger (attendance, advances, extras, settlements)
export const getWorkerLedger = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const [attendanceList, advancesList, extrasList, settlementsList] =
      await Promise.all([
        Attendance.find({ workerId }).lean(),
        Advance.find({ workerId }).lean(),
        Extra.find({ workerId }).lean(),
        Settlement.find({ workerId }).lean(),
      ]);

    const entries = [];

    // Attendance → YOU GOT (worker worked, you owe money)
    attendanceList.forEach((a) => {
      const amount = a.total || 0;
      entries.push({
        _id: a._id,
        type: "attendance",
        direction: "in", // YOU GOT (work)
        amount,
        label:
          a.note ||
          (a.hoursWorked ? `${a.hoursWorked} hr worked` : "Attendance added"),
        createdAt: a.date,
      });
    });

    // Advances → YOU GAVE (you paid worker)
    advancesList.forEach((adv) => {
      const amount = adv.amount || 0;
      entries.push({
        _id: adv._id,
        type: "advance",
        direction: "out", // YOU GAVE money
        amount,
        label: adv.note || "Advance paid",
        createdAt: adv.date,
      });
    });

    // Extras → YOU GAVE (items like wheat bag)
    extrasList.forEach((ex) => {
      const amount = ex.price || 0;
      entries.push({
        _id: ex._id,
        type: "extra",
        direction: "out", // YOU GAVE value
        amount,
        label: ex.itemName
          ? `${ex.itemName} given`
          : ex.note || "Extra item given",
        createdAt: ex.date,
      });
    });

    // Settlements → usually YOU GAVE (paying dues)
    settlementsList.forEach((st) => {
      let amt = st.netAmount || 0;
      const isOut = amt >= 0; // positive = you paid worker; negative = worker gave you
      amt = Math.abs(amt);

      entries.push({
        _id: st._id,
        type: "settlement",
        direction: isOut ? "out" : "in",
        amount: amt,
        label: st.note || "Settlement",
        createdAt: st.createdAt || st.endDate || st.startDate,
      });
    });

    // Sort newest first
    entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      msg: "Worker ledger fetched",
      worker: {
        _id: worker._id,
        name: worker.name,
        remarks: worker.remarks || "",
        status: worker.status || "active",
      },
      entries,
    });
  } catch (error) {
    console.log("Error in getWorkerLedger", error);
    return res.status(500).json({ msg: "Error in getting worker ledger" });
  }
};

// ✅ 7. Create month-wise settlement
export const createMonthWiseSettlement = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, includeTillToday, note } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Parse dates
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // Fetch entries based on toggle
    let attendance, advances, extras;

    if (includeTillToday) {
      // Include everything till today
      const today = new Date();
      [attendance, advances, extras] = await Promise.all([
        Attendance.find({
          workerId,
          date: { $gte: start, $lte: end },
          isSettled: false,
        }).lean(),
        Advance.find({
          workerId,
          date: { $gte: start, $lte: today },
          isSettled: false,
        }).lean(),
        Extra.find({
          workerId,
          date: { $gte: start, $lte: today },
          isSettled: false,
        }).lean(),
      ]);
    } else {
      [attendance, advances, extras] = await Promise.all([
        Attendance.find({
          workerId,
          date: { $gte: start, $lte: end },
          isSettled: false,
        }).lean(),
        Advance.find({
          workerId,
          date: { $gte: start, $lte: end },
          isSettled: false,
        }).lean(),
        Extra.find({
          workerId,
          date: { $gte: start, $lte: end },
          isSettled: false,
        }).lean(),
      ]);
    }

    if (!attendance.length && !advances.length && !extras.length) {
      return res
        .status(400)
        .json({ msg: "No entries to settle in this date range" });
    }

    // Calculate amounts
    const attendanceTotal = attendance.reduce((s, a) => s + (a.total || 0), 0);
    const advancesTotal = advances.reduce((s, a) => s + (a.amount || 0), 0);
    const extrasTotal = extras.reduce((s, e) => s + (e.price || 0), 0);
    const netAmount = attendanceTotal - advancesTotal - extrasTotal;

    // Create settlement
    const settlement = await Settlement.create({
      workerId,
      farmerId: req.user.id,
      startDate: start,
      endDate: end,
      attendanceTotal,
      advancesTotal,
      extrasTotal,
      netAmount,
      note: note || `Month-wise settlement: ${startDate} to ${endDate}`,
    });

    // Mark entries as settled
    await Promise.all([
      Attendance.updateMany(
        { _id: { $in: attendance.map((a) => a._id) } },
        { isSettled: true, settlementId: settlement._id }
      ),
      Advance.updateMany(
        { _id: { $in: advances.map((a) => a._id) } },
        { isSettled: true, settlementId: settlement._id }
      ),
      Extra.updateMany(
        { _id: { $in: extras.map((e) => e._id) } },
        { isSettled: true, settlementId: settlement._id }
      ),
    ]);

    return res
      .status(201)
      .json({ msg: "Month-wise settlement created successfully" });
  } catch (err) {
    console.error("createMonthWiseSettlement error:", err);
    return res
      .status(500)
      .json({ msg: "Error in creating month-wise settlement" });
  }
};

// ✅ 6. Get month-wise summary for custom date range
export const getWorkerMonthWiseSummary = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, includeTillToday, isViewMode } = req.query;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Parse dates
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    const includeAdvancesExtras = includeTillToday === "true";

    // Fetch entries based on toggle
    let attendance, advances, extras;

    if (includeAdvancesExtras) {
      // Include everything till today
      const today = new Date();
      [attendance, advances, extras] = await Promise.all([
        Attendance.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
        Advance.find({
          workerId,
          date: { $gte: start, $lte: today },
        }).lean(),
        Extra.find({
          workerId,
          date: { $gte: start, $lte: today },
        }).lean(),
      ]);
    } else {
      // Include advances & extras till END DATE (not today)
      [attendance, advances, extras] = await Promise.all([
        Attendance.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
        Advance.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
        Extra.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
      ]);
    }

    // Combine and sort by date
    const entries = [];

    attendance.forEach((a) => {
      entries.push({
        date: a.date.toISOString().split("T")[0],
        type: "attendance",
        description: a.note || `${a.hoursWorked || 0} hours worked`,
        debit: 0,
        credit: a.total || 0,
        settled: a.isSettled || false,
        rawDate: a.date,
      });
    });

    advances.forEach((adv) => {
      entries.push({
        date: adv.date.toISOString().split("T")[0],
        type: "advance",
        description: adv.note || "Advance paid",
        debit: adv.amount || 0,
        credit: 0,
        settled: adv.isSettled || false,
        rawDate: adv.date,
      });
    });

    extras.forEach((ex) => {
      entries.push({
        date: ex.date.toISOString().split("T")[0],
        type: "extra",
        description: ex.itemName
          ? `${ex.itemName} given`
          : ex.note || "Extra item",
        debit: ex.price || 0,
        credit: 0,
        settled: ex.isSettled || false,
        rawDate: ex.date,
      });
    });

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    // Calculate running balance
    let runningBalance = 0;

    entries.forEach((entry) => {
      if (!entry.settled) {
        runningBalance += entry.credit - entry.debit;
        entry.runningBalance = runningBalance;
      } else {
        entry.runningBalance = null; // or "—" in UI/PDF
      }
    });

    // Calculate totals
    const entriesForTotals = entries.filter((e) => !e.settled);

    const totalCredits = entriesForTotals.reduce((s, e) => s + e.credit, 0);
    const totalDebits = entriesForTotals.reduce((s, e) => s + e.debit, 0);
    const netPayable = totalCredits - totalDebits;

    return res.status(200).json({
      msg: "Month-wise summary fetched",
      entries,
      totals: {
        totalCredits,
        totalDebits,
        netPayable,
      },
      dateRange: {
        startDate,
        endDate,
        includeTillToday: includeTillToday === "true",
      },
    });
  } catch (error) {
    console.log("Error in getWorkerMonthWiseSummary", error);
    return res.status(500).json({ msg: "Error in getting month-wise summary" });
  }
};

// ✅ 5. Get last settlement date for a worker (for month-wise settle start date)
export const getWorkerLastSettlement = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const lastSettlement = await Settlement.findOne({ workerId })
      .sort({ endDate: -1 })
      .select("endDate")
      .lean();

    let startDate;
    if (lastSettlement) {
      // If there's a previous settlement, start from the next day
      const lastEndDate = new Date(lastSettlement.endDate);
      lastEndDate.setDate(lastEndDate.getDate() + 1);
      startDate = lastEndDate.toISOString().split("T")[0];
    } else {
      // If no previous settlement, find the earliest unsettled entry
      const [attendance, advances, extras] = await Promise.all([
        Attendance.find({ workerId, isSettled: false }).lean(),
        Advance.find({ workerId, isSettled: false }).lean(),
        Extra.find({ workerId, isSettled: false }).lean(),
      ]);

      const pendingDates = [
        ...attendance.map((a) => a.date),
        ...advances.map((a) => a.date),
        ...extras.map((e) => e.date),
      ]
        .filter(Boolean)
        .map((d) => d.toISOString().split("T")[0]);

      startDate = pendingDates.length
        ? pendingDates.reduce((a, b) => (a < b ? a : b))
        : null;
    }

    return res.status(200).json({
      msg: "Last settlement fetched",
      lastSettledDate: lastSettlement
        ? lastSettlement.endDate.toISOString().split("T")[0]
        : null,
      suggestedStartDate: startDate,
    });
  } catch (error) {
    console.log("Error in getWorkerLastSettlement", error);
    return res.status(500).json({ msg: "Error in getting last settlement" });
  }
};

// ✅ 8. Generate PDF for month-wise summary
export const generateMonthWisePDF = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, includeTillToday, isViewMode } = req.query;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const farmer = await Farmer.findById(req.user.id);

    // Parse dates
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // Fetch entries based on toggle
    let attendance, advances, extras;

    if (includeTillToday === "true") {
      // Include everything till today
      const today = new Date();
      [attendance, advances, extras] = await Promise.all([
        Attendance.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
        Advance.find({
          workerId,
          date: { $gte: start, $lte: today },
        }).lean(),
        Extra.find({
          workerId,
          date: { $gte: start, $lte: today },
        }).lean(),
      ]);
    } else {
      [attendance, advances, extras] = await Promise.all([
        Attendance.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
        Advance.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
        Extra.find({
          workerId,
          date: { $gte: start, $lte: end },
        }).lean(),
      ]);
    }

    // Process entries
    const entries = [];

    attendance.forEach((a) => {
      entries.push({
        date: a.date.toISOString().split("T")[0],
        type: "attendance",
        description: a.note || `${a.hoursWorked || 0} hours worked`,
        debit: 0,
        credit: a.total || 0,
        settled: a.isSettled || false,
        rawDate: a.date,
      });
    });

    advances.forEach((adv) => {
      entries.push({
        date: adv.date.toISOString().split("T")[0],
        type: "advance",
        description: adv.note || "Advance paid",
        debit: adv.amount || 0,
        credit: 0,
        settled: adv.isSettled || false,
        rawDate: adv.date,
      });
    });

    extras.forEach((ex) => {
      entries.push({
        date: ex.date.toISOString().split("T")[0],
        type: "extra",
        description: ex.itemName
          ? `${ex.itemName} given`
          : ex.note || "Extra item",
        debit: ex.price || 0,
        credit: 0,
        settled: ex.isSettled || false,
        rawDate: ex.date,
      });
    });

    entries.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    let runningBalance = 0;

    entries.forEach((entry) => {
      if (!entry.settled) {
        runningBalance += entry.credit - entry.debit;
        entry.runningBalance = runningBalance;
      } else {
        entry.runningBalance = null;
      }
    });

    const entriesForTotals = entries.filter((e) => !e.settled);

    const totalCredits = entriesForTotals.reduce((s, e) => s + e.credit, 0);
    const totalDebits = entriesForTotals.reduce((s, e) => s + e.debit, 0);
    const netPayable = totalCredits - totalDebits;

    // Generate PDF
    const doc = new PDFDocument();
    const buffers = [];

    const fontPath = path.join(
      process.cwd(),
      "assets/fonts/NotoSans-VariableFont_wdth,wght.ttf"
    );

    doc.registerFont("NotoSans", fontPath);
    doc.font("NotoSans");

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=settlement-${worker.name}-${endDate}.pdf`
      );
      res.send(pdfData);
    });

    // PDF Content
    doc
      .fontSize(20)
      .text(
        isViewMode === "true" ? "Worker Ledger" : "Worker Settlement Slip",
        { align: "center" }
      );
    doc.moveDown();

    // Header info
    doc.fontSize(12);
    doc.text(`Worker: ${worker.name}`);
    doc.text(`Farmer: ${farmer.name}`);
    doc.text(`Date Range: ${startDate} to ${endDate}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.text(`Status: ${isViewMode === "true" ? "View" : "Preview"}`);
    doc.moveDown();

    // Table
    const tableTop = doc.y;

    // Headers
    doc.fontSize(10);
    doc.text("Date", 50, tableTop);
    doc.text("Type", 130, tableTop);
    doc.text("Description", 210, tableTop);
    doc.text("Debit", 360, tableTop, { width: 50, align: "right" });
    doc.text("Credit", 420, tableTop, { width: 50, align: "right" });
    doc.text("Balance", 480, tableTop, { width: 60, align: "right" });

    // Line
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Entries
    let y = tableTop + 25;
    entries.forEach((entry) => {
      // 👇 SET COLOR BEFORE DRAWING THE ROW
      if (entry.settled) {
        doc.fillColor("gray");
      } else {
        doc.fillColor("black");
      }

      doc.text(entry.date, 50, y);
      doc.text(entry.type, 130, y);

      const desc = entry.settled ? `○ ${entry.description}` : entry.description;

      doc.text(desc, 210, y, { width: 140 });

      if (entry.debit > 0) {
        doc.text(`₹${entry.debit}`, 360, y, {
          width: 50,
          align: "right",
        });
      }

      if (entry.credit > 0) {
        doc.text(`₹${entry.credit}`, 420, y, {
          width: 50,
          align: "right",
        });
      }

      doc.text(entry.settled ? "—" : `₹${entry.runningBalance}`, 480, y, {
        width: 60,
        align: "right",
      });

      // 👇 RESET COLOR SO NEXT CONTENT IS NOT GREY
      doc.fillColor("black");

      y += 20;
    });

    // Totals
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    doc.fontSize(12).text("TOTALS", 50, y);
    doc.text(`₹${totalDebits}`, 360, y, { width: 50, align: "right" });
    doc.text(`₹${totalCredits}`, 420, y, { width: 50, align: "right" });
    doc.text(`₹${netPayable}`, 480, y, { width: 60, align: "right" });

    // Note for settled entries
    y += 25;

    doc.fontSize(10).fillColor("black");
    doc.text("● Pending entries (included in totals)", 50, y);

    y += 12;
    doc.fillColor("gray");
    doc.text("○ Settled entries (shown for reference only)", 50, y);

    // reset for safety
    doc.fillColor("black");
    doc.end(); // 🔥 REQUIRED — flushes PDF stream
  } catch (error) {
    console.log("Error in generateMonthWisePDF", error);
    return res.status(500).json({ msg: "Error generating PDF" });
  }
};
