import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Extra from "../models/Extra.js";
import Settlement from "../models/Settlement.js";
import PDFDocument from "pdfkit";
import Farmer from "../models/Farmer.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helper → ALWAYS send date-only string (no timezone bugs)
const toDateOnly = (date) => (date ? date.toISOString().split("T")[0] : null);

const formatPrettyDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
    const presentAttendance = attendance.filter((a) => a.status === "present");

    const attendanceTotal = presentAttendance.reduce(
      (s, a) => s + (a.total || 0),
      0,
    );

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
        { isSettled: true, settlementId: settlement._id },
      ),
      Advance.updateMany(
        { _id: { $in: advances.map((a) => a._id) } },
        { isSettled: true, settlementId: settlement._id },
      ),
      Extra.updateMany(
        { _id: { $in: extras.map((e) => e._id) } },
        { isSettled: true, settlementId: settlement._id },
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
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
        { isSettled: true, settlementId: settlement._id },
      ),
      Advance.updateMany(
        { _id: { $in: advances.map((a) => a._id) } },
        { isSettled: true, settlementId: settlement._id },
      ),
      Extra.updateMany(
        { _id: { $in: extras.map((e) => e._id) } },
        { isSettled: true, settlementId: settlement._id },
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
      if (a.status === "inactive") return; // ⛔ ignore fully

      entries.push({
        date: a.date.toISOString().split("T")[0],
        type: "attendance",
        description:
          a.status === "absent"
            ? `Absent – ${a.note || "No reason"}`
            : a.note || `${a.hoursWorked || 0} hours worked`,
        debit: 0,
        credit: a.status === "present" ? a.total || 0 : 0,
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
    const entriesForTotals = entries.filter((e) =>
      !e.settled && e.type !== "attendance" ? true : e.credit > 0,
    );

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
      if (a.status === "inactive") return;

      entries.push({
        date: a.date.toISOString().split("T")[0],
        type: "attendance",
        description:
          a.status === "absent"
            ? `Absent – ${a.note || "No reason"}`
            : a.note || `${a.hoursWorked || 0} hours worked`,
        debit: 0,
        credit: a.status === "present" ? a.total || 0 : 0,
        settled: a.isSettled || false,
        rawDate: a.date,

        // ✅ ADD THESE (CRITICAL)
        hoursWorked: a.status === "present" ? a.hoursWorked || 0 : 0,
        rate: a.status === "present" ? a.rate || 0 : 0,
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

    // ✅ Group entries by Month (e.g. "January 2026")
    const groupedByMonth = {};

    entries.forEach((entry) => {
      const monthKey = new Date(entry.rawDate).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = [];
      }

      groupedByMonth[monthKey].push(entry);
    });

    const entriesForTotals = entries.filter((e) => !e.settled && e.credit > 0);

    const totalCredits = entriesForTotals.reduce((s, e) => s + e.credit, 0);
    const totalDebits = entriesForTotals.reduce((s, e) => s + e.debit, 0);
    const netPayable = totalCredits - totalDebits;

    // Generate PDF
    const doc = new PDFDocument();
    const buffers = [];

    let y = 0;

    const ensureSpace = (requiredHeight) => {
      const bottomMargin = 50;

      if (y + requiredHeight > doc.page.height - bottomMargin) {
        doc.addPage();
        y = 50; // reset cursor to top margin on new page
      }
    };

    const fontPath = path.join(
      process.cwd(),
      "assets/fonts/NotoSans-VariableFont_wdth,wght.ttf",
    );

    doc.registerFont("NotoSans", fontPath);
    doc.font("NotoSans");

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=settlement-${worker.name}-${endDate}.pdf`,
      );
      res.send(pdfData);
    });

    // Logo placeholder box

    const logoPath = path.resolve(
      __dirname,
      "..", // controller → backend
      "..", // backend → wms-worker-management-system
      "wms-frontend",
      "public",
      "icon-192.png",
    );

    doc.image(logoPath, 50, 40, { width: 60 });

    console.log("Logo path:", logoPath);
    console.log("Logo exists:", fs.existsSync(logoPath));
    // PDF Content
    // ================= HEADER =================

    doc.fillColor("#111827");

    // Main title
    doc
      .fontSize(22)
      .font("NotoSans")
      .text(
        isViewMode === "true"
          ? "WORKER LEDGER STATEMENT"
          : "WORKER SETTLEMENT STATEMENT",
        { align: "center" },
      );

    // Subtitle
    doc
      .moveDown(0.3)
      .fontSize(11)
      .fillColor("#4b5563")
      .text("Attendance & Payment Summary", { align: "center" });

    // Left column
    const leftX = 50;
    const rightX = 330;
    let headerY = doc.y;

    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(`Worker Name : ${worker.name}`, leftX, headerY)
      .text(`Farmer Name : ${farmer.name}`, leftX, headerY + 16)
      .text(
        `Period      : ${formatPrettyDate(start)} – ${formatPrettyDate(end)}`,
        leftX,
        headerY + 32,
      );

    // Right column
    doc
      .text(
        `Generated : ${new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        rightX,
        headerY,
      )
      .text(
        `Status    : ${isViewMode === "true" ? "VIEW" : "PREVIEW"}`,
        rightX,
        headerY + 16,
      );

    // Divider line
    y = doc.y + 20;
    doc.strokeColor("#9ca3af").moveTo(50, y).lineTo(550, y).stroke();

    doc.y = y;

    if (isViewMode === "true") {
      doc
        .save()
        .rotate(-45, { origin: [300, 400] })
        .fontSize(60)
        .fillColor("#e5e7eb")
        .opacity(0.25)
        .text("WMS", 100, 400, { align: "center" })
        .restore();
    }

    // ===== NET PAYABLE BADGE =====
    const badgeWidth = 200;
    const badgeHeight = 42;
    const badgeX = 350;
    const badgeY = y + 10;

    doc
      .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 8)
      .fillAndStroke("#ecfdf5", "#10b981");

    doc
      .fillColor("#065f46")
      .fontSize(10)
      .text("NET PAYABLE", badgeX + 12, badgeY + 8);

    doc
      .fontSize(16)
      .font("NotoSans")
      .text(`₹ ${netPayable}`, badgeX + 12, badgeY + 20);

    doc.fillColor("black");

    doc.fillColor("black");

    // Table
    y = doc.y;

    // Headers
    doc.fontSize(10);
    doc.text("Date", 50, y);
    doc.text("Type", 130, y);
    doc.text("Description", 210, y);
    doc.text("To be Paid", 360, y, { width: 50, align: "right" });
    doc.text("Paid", 420, y, { width: 50, align: "right" });
    doc.text("Balance", 480, y, { width: 60, align: "right" });

    y += 15;

    doc.moveTo(50, y).lineTo(550, y).stroke();

    y += 10;

    // Entries
    // let y = tableTop + 25;
    // entries.forEach((entry) => {
    //   // 👇 SET COLOR BEFORE DRAWING THE ROW
    //   const isAbsentAttendance =
    //     entry.type === "attendance" && entry.credit === 0 && !entry.settled;

    //   // 1️⃣ Set row color + font
    //   if (entry.settled) {
    //     doc.fillColor("gray").font("NotoSans");
    //   } else if (isAbsentAttendance) {
    //     doc.fillColor("#b45309").font("NotoSans"); // amber + italic
    //   } else {
    //     doc.fillColor("black").font("NotoSans");
    //   }

    //   // 2️⃣ Date + Type
    //   doc.text(entry.date, 50, y);
    //   doc.text(entry.type, 130, y);

    //   // 3️⃣ Description (MAKE ABSENT EXPLICIT)
    //   const desc = isAbsentAttendance
    //     ? `${entry.description}`
    //     : entry.settled
    //       ? `○ ${entry.description}`
    //       : entry.description;

    //   doc.text(desc, 210, y, { width: 140 });

    //   // 4️⃣ Debit
    //   if (entry.debit > 0) {
    //     doc.text(`₹${entry.debit}`, 360, y, {
    //       width: 50,
    //       align: "right",
    //     });
    //   }

    //   // 5️⃣ Credit (VERY IMPORTANT)
    //   if (isAbsentAttendance) {
    //     doc.text("—", 420, y, { width: 50, align: "right" });
    //   } else if (entry.credit > 0) {
    //     doc.text(`₹${entry.credit}`, 420, y, {
    //       width: 50,
    //       align: "right",
    //     });
    //   }

    //   // 6️⃣ Balance
    //   doc.text(entry.settled ? "—" : `₹${entry.runningBalance}`, 480, y, {
    //     width: 60,
    //     align: "right",
    //   });

    //   // 7️⃣ Reset font + color
    //   doc.fillColor("black").font("NotoSans");

    //   if (entry.type === "attendance" && entry.credit === 0) {
    //     doc.fillColor("orange");
    //   }

    //   // 👇 RESET COLOR SO NEXT CONTENT IS NOT GREY
    //   doc.fillColor("black");

    //   y += 20;
    // });

    Object.entries(groupedByMonth).forEach(([month, monthEntries]) => {
      // ⛔ Prevent month header + summary from splitting pages
      ensureSpace(180); // safe estimate for month block

      // 🔵 Month Header
      doc
        .fontSize(11)
        .fillColor("#1f2937")
        .font("NotoSans")
        .text(month.toUpperCase(), 50, y);

      y += 12;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 8;

      let monthCredits = 0;
      let monthDebits = 0;

      // ✅ Rate-wise hour aggregation (per month)
      const rateWiseHours = {};

      // Only attendance entries count
      monthEntries.forEach((entry) => {
        if (
          entry.type === "attendance" &&
          entry.hoursWorked > 0 &&
          entry.rate > 0
        ) {
          if (!rateWiseHours[entry.rate]) {
            rateWiseHours[entry.rate] = {
              hours: 0,
              amount: 0,
            };
          }

          rateWiseHours[entry.rate].hours += entry.hoursWorked;
          rateWiseHours[entry.rate].amount += entry.hoursWorked * entry.rate;
        }
      });

      monthEntries.forEach((entry) => {
        const isAbsentAttendance =
          entry.type === "attendance" && entry.credit === 0 && !entry.settled;
        const isAdvanceOrExtra =
          (entry.type === "advance" || entry.type === "extra") &&
          !entry.settled;

        // Color rules
        if (entry.settled) {
          doc.fillColor("gray");
        } else if (isAbsentAttendance) {
          doc.fillColor("#b45309"); // amber for absent
        } else if (isAdvanceOrExtra) {
          doc.fillColor("#059669"); // green for advances and extras
        } else {
          doc.fillColor("black"); // black for attendance
        }

        // Date (NEW FORMAT)
        doc.text(formatPrettyDate(entry.rawDate), 50, y);

        // Type
        doc.text(entry.type, 130, y);

        // Description
        const desc = isAbsentAttendance
          ? `${entry.description}`
          : entry.settled
            ? `○ ${entry.description}`
            : entry.description;

        doc.text(desc, 210, y, { width: 140 });

        // Credit (To be Paid column - position 360)
        if (!isAbsentAttendance && entry.credit > 0) {
          doc.text(`₹${entry.credit}`, 360, y, {
            width: 50,
            align: "right",
          });
          monthCredits += entry.credit;
        } else {
          doc.text("—", 360, y, { width: 50, align: "right" });
        }

        // Debit (Paid column - position 420)
        if (entry.debit > 0) {
          doc.text(`₹${entry.debit}`, 420, y, {
            width: 50,
            align: "right",
          });
          monthDebits += entry.debit;
        }

        // Balance
        doc.text(entry.settled ? "—" : `₹${entry.runningBalance}`, 480, y, {
          width: 60,
          align: "right",
        });

        y += 18;
        doc.fillColor("black");
      });

      // 🧾 Rate-wise hours summary (IN A BOX)
      const rateEntries = Object.entries(rateWiseHours);

      if (rateEntries.length > 0) {
        const hoursBoxWidth = 220;
        const hoursBoxHeight = 12 + rateEntries.length * 12 + 12; // dynamic height
        const hoursBoxX = 50;
        const hoursBoxY = y;

        ensureSpace(hoursBoxHeight + 10);

        doc
          .roundedRect(hoursBoxX, hoursBoxY, hoursBoxWidth, hoursBoxHeight, 6)
          .stroke("#9ca3af");

        doc.fontSize(9).fillColor("#111827");
        doc.text("Hours Summary (Rate-wise):", hoursBoxX + 10, hoursBoxY + 6);

        let innerY = hoursBoxY + 18;
        rateEntries.forEach(([rate, data]) => {
          doc.fillColor("#374151");
          doc.text(
            `${data.hours} hr @ ₹${rate}/hr  =  ₹${data.amount}`,
            hoursBoxX + 10,
            innerY,
          );
          innerY += 12;
        });

        y += hoursBoxHeight + 8;
        doc.fillColor("black");
      }

      // 📦 Month Summary (BELOW HOURS SUMMARY - LEFT SIDE)
      const boxWidth = 220;
      const boxHeight = 58;
      const boxX = 50;
      const boxY = y;

      ensureSpace(boxHeight + 10);

      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 6).stroke("#9ca3af");

      doc
        .fontSize(9)
        .fillColor("#111827")
        .text("Month Summary", boxX + 10, boxY + 6);

      doc.text(`Paid: ₹${monthDebits}`, boxX + 10, boxY + 18);
      doc.text(`Earned: ₹${monthCredits}`, boxX + 10, boxY + 30);
      doc.text(
        `Net for Month: ₹${monthCredits - monthDebits}`,
        boxX + 10,
        boxY + 42,
      );

      y += boxHeight + 15;

      doc.fillColor("black");
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
    doc.text("Pending entries (included in totals)", 50, y);

    y += 12;
    doc.fillColor("#b45309").font("NotoSans");
    doc.text("ABSENT — No payment for this day", 50, y);

    doc.fillColor("black").font("NotoSans");

    y += 12;
    doc.fillColor("gray");
    doc.text("Settled entries (shown for reference only)", 50, y);

    // reset for safety
    doc.fillColor("black");
    // ===== SIGNATURE SECTION =====
    ensureSpace(120);

    doc.strokeColor("#9ca3af").moveTo(350, doc.y).lineTo(520, doc.y).stroke();

    doc
      .fontSize(10)
      .fillColor("#111827")
      .text("Signature", 350, doc.y + 5);

    doc.fillColor("black");

    doc.on("end", () => {
      const pageRange = doc.bufferedPageRange(); // { start, count }

      for (
        let i = pageRange.start;
        i < pageRange.start + pageRange.count;
        i++
      ) {
        doc.switchToPage(i);

        doc
          .fontSize(9)
          .fillColor("#6b7280")
          .text(
            `Page ${i + 1} of ${pageRange.count}`,
            0,
            doc.page.height - 40,
            {
              align: "center",
            },
          );
      }
    });

    doc.end(); // 🔥 REQUIRED — flushes PDF stream
  } catch (error) {
    console.log("Error in generateMonthWisePDF", error);
    return res.status(500).json({ msg: "Error generating PDF" });
  }
};
