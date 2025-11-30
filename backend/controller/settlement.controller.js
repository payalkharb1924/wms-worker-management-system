import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Extra from "../models/Extra.js";
import Settlement from "../models/Settlement.js";

// ✅ 1. Get pending summary for a worker (unsettled only)
export const getWorkerPendingSummary = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // last settlement
    const lastSettlement = await Settlement.findOne({ workerId })
      .sort({ endDate: -1 })
      .lean();

    const lastSettledTill = lastSettlement ? lastSettlement.endDate : null;

    // All UNSETTLED entries (we can later filter by date if needed)
    const [attendanceList, advancesList, extrasList] = await Promise.all([
      Attendance.find({
        workerId,
        isSettled: false,
      }).lean(),
      Advance.find({
        workerId,
        isSettled: false,
      }).lean(),
      Extra.find({
        workerId,
        isSettled: false,
      }).lean(),
    ]);

    const attendanceTotal = attendanceList.reduce(
      (sum, a) => sum + (a.total || 0),
      0
    );
    const advancesTotal = advancesList.reduce(
      (sum, adv) => sum + (adv.amount || 0),
      0
    );
    const extrasTotal = extrasList.reduce(
      (sum, ex) => sum + (ex.price || 0),
      0
    );

    const netPending = attendanceTotal - advancesTotal - extrasTotal;

    // Suggest default period for next settlement
    // start = (lastSettledTill + 1 day) OR null
    let suggestedStartDate = null;
    if (lastSettledTill) {
      const d = new Date(lastSettledTill);
      d.setDate(d.getDate() + 1);
      suggestedStartDate = d;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
      lastSettledTill,
      suggestedStartDate,
      suggestedEndDate: today,
    });
  } catch (error) {
    console.log("Error in getWorkerPendingSummary", error);
    return res
      .status(500)
      .json({ msg: "Error in getting worker pending summary" });
  }
};

// ✅ 2. Create a settlement for a worker (set all in range to settled)
export const createSettlementForWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, note } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "Start and end date required" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({ msg: "Start date cannot be after end" });
    }

    // Guard: don't allow going "behind" last settlement
    const lastSettlement = await Settlement.findOne({ workerId })
      .sort({ endDate: -1 })
      .lean();

    if (lastSettlement && start <= lastSettlement.endDate) {
      return res.status(400).json({
        msg: `Already settled till ${lastSettlement.endDate.toDateString()}`,
      });
    }

    // Fetch all UNSETTLED entries in this period
    const [attendanceList, advancesList, extrasList] = await Promise.all([
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

    const attendanceTotal = attendanceList.reduce(
      (sum, a) => sum + (a.total || 0),
      0
    );
    const advancesTotal = advancesList.reduce(
      (sum, adv) => sum + (adv.amount || 0),
      0
    );
    const extrasTotal = extrasList.reduce(
      (sum, ex) => sum + (ex.price || 0),
      0
    );

    const netAmount = attendanceTotal - advancesTotal - extrasTotal;

    // Even if nothing to settle, you *could* block:
    if (
      attendanceList.length === 0 &&
      advancesList.length === 0 &&
      extrasList.length === 0
    ) {
      return res.status(400).json({
        msg: "No pending entries to settle in this range",
      });
    }

    // Create settlement row
    const settlement = await Settlement.create({
      workerId,
      farmerId: req.user.id,
      startDate: start,
      endDate: end,
      attendanceTotal,
      extrasTotal,
      advancesTotal,
      netAmount,
      note: note || "",
    });

    const attendanceIds = attendanceList.map((a) => a._id);
    const advanceIds = advancesList.map((a) => a._id);
    const extraIds = extrasList.map((e) => e._id);

    // Mark all matched entries as settled
    await Promise.all([
      attendanceIds.length
        ? Attendance.updateMany(
            { _id: { $in: attendanceIds } },
            { $set: { isSettled: true, settlementId: settlement._id } }
          )
        : Promise.resolve(),
      advanceIds.length
        ? Advance.updateMany(
            { _id: { $in: advanceIds } },
            { $set: { isSettled: true, settlementId: settlement._id } }
          )
        : Promise.resolve(),
      extraIds.length
        ? Extra.updateMany(
            { _id: { $in: extraIds } },
            { $set: { isSettled: true, settlementId: settlement._id } }
          )
        : Promise.resolve(),
    ]);

    // Recalculate remaining pending (after this settlement)
    const [remainingAttendance, remainingAdvances, remainingExtras] =
      await Promise.all([
        Attendance.find({ workerId, isSettled: false }).lean(),
        Advance.find({ workerId, isSettled: false }).lean(),
        Extra.find({ workerId, isSettled: false }).lean(),
      ]);

    const remainingAttendanceTotal = remainingAttendance.reduce(
      (sum, a) => sum + (a.total || 0),
      0
    );
    const remainingAdvancesTotal = remainingAdvances.reduce(
      (sum, a) => sum + (a.amount || 0),
      0
    );
    const remainingExtrasTotal = remainingExtras.reduce(
      (sum, e) => sum + (e.price || 0),
      0
    );

    const remainingNet =
      remainingAttendanceTotal - remainingAdvancesTotal - remainingExtrasTotal;

    return res.status(201).json({
      msg: "Settlement created",
      settlement: {
        ...settlement._doc,
        netPending: settlement.netAmount, // alias for frontend
      },
      remaining: {
        attendanceTotal: remainingAttendanceTotal,
        advancesTotal: remainingAdvancesTotal,
        extrasTotal: remainingExtrasTotal,
        netPending: remainingNet, // frontend uses this
      },
    });
  } catch (error) {
    console.log("Error in createSettlementForWorker", error);
    return res.status(500).json({ msg: "Error in creating worker settlement" });
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
