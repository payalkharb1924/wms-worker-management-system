import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Extra from "../models/Extra.js";
import Settlement from "../models/Settlement.js";

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
