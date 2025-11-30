// controller/insights.controller.js
import mongoose from "mongoose";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Extra from "../models/Extra.js";
import Settlement from "../models/Settlement.js";

const { ObjectId } = mongoose.Types;

// GET /api/insights/overview
// Returns all dashboard insights for the logged-in farmer
export const getFarmerInsightsOverview = async (req, res) => {
  try {
    const farmerId = req.user.id;

    // 1) Load all workers for this farmer
    const workers = await Worker.find({ farmerId }).lean();
    const workerIds = workers.map((w) => w._id.toString());
    const workerMap = {};
    workers.forEach((w) => {
      workerMap[w._id.toString()] = w;
    });

    if (workerIds.length === 0) {
      return res.status(200).json({
        msg: "No workers yet",
        data: {
          pendingTotals: {
            attendanceTotal: 0,
            advancesTotal: 0,
            extrasTotal: 0,
            netPending: 0,
          },
          totalSettledNet: 0,
          monthlyWageTrend: [],
          breakdownAllTime: {
            attendanceTotal: 0,
            advancesTotal: 0,
            extrasTotal: 0,
          },
          topWorkersByWages: [],
          topWorkersByHours: [],
          pendingPerWorker: [],
          advanceHeavyWorkers: [],
          weeklyAttendanceTrend: [],
          attendanceReliability: [],
          workersOverdueSettlement: [],
        },
      });
    }

    // Optional windows
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 2) Load attendance/adv/extra/settlements relevant to these workers
    const [attendance, advances, extras, settlements] = await Promise.all([
      Attendance.find({ workerId: { $in: workerIds } }).lean(),
      Advance.find({ workerId: { $in: workerIds } }).lean(),
      Extra.find({ workerId: { $in: workerIds } }).lean(),
      Settlement.find({ farmerId: new ObjectId(farmerId) }).lean(),
    ]);

    // ---------- Helper accumulators ----------
    const pendingByWorker = {}; // workerId -> {attendanceTotal, advancesTotal, extrasTotal}
    const allTimeTotals = {
      attendanceTotal: 0,
      advancesTotal: 0,
      extrasTotal: 0,
    };
    const hoursByWorker = {}; // workerId -> total hours
    const attendanceByDay = {}; // 'YYYY-MM-DD' -> hours
    const reliabilityDaysByWorker = {}; // workerId -> Set(dateString)
    const lastSettlementByWorker = {}; // workerId -> last settlement date

    // 3) Process settlements
    let totalSettledNet = 0;
    const monthlyMap = {}; // 'YYYY-MM' -> sum netAmount
    const wagesByWorker = {}; // workerId -> total netAmount

    settlements.forEach((s) => {
      if (!s.workerId) return;
      const wId = s.workerId.toString();
      if (!workerMap[wId]) return; // skip foreign worker

      totalSettledNet += s.netAmount || 0;

      // 3a) monthly wage trend (based on endDate)
      const d = new Date(s.endDate || s.startDate || s.createdAt);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      monthlyMap[ym] = (monthlyMap[ym] || 0) + (s.netAmount || 0);

      // 3b) wages per worker
      wagesByWorker[wId] = (wagesByWorker[wId] || 0) + (s.netAmount || 0);

      // 3c) last settlement per worker
      const cur = lastSettlementByWorker[wId];
      if (!cur || new Date(s.endDate) > cur) {
        lastSettlementByWorker[wId] = new Date(s.endDate || s.createdAt);
      }
    });

    const monthlyWageTrend = Object.entries(monthlyMap)
      .map(([key, totalNet]) => {
        const [year, month] = key.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        return {
          key,
          label: date.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          }),
          totalNet,
        };
      })
      .sort((a, b) => (a.key > b.key ? 1 : -1));

    // 4) Attendance – all time & windows
    attendance.forEach((a) => {
      const wId = a.workerId?.toString();
      if (!workerMap[wId]) return;

      const total = a.total || 0;
      const hours = a.hoursWorked || 0;
      const date = new Date(a.date);

      // all-time totals
      allTimeTotals.attendanceTotal += total;

      // hours per worker
      hoursByWorker[wId] = (hoursByWorker[wId] || 0) + hours;

      // daily trend (last 30 days)
      if (date >= thirtyDaysAgo) {
        const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
        attendanceByDay[dayKey] = (attendanceByDay[dayKey] || 0) + hours;
      }

      // reliability (unique days per worker in last 30 days)
      if (date >= thirtyDaysAgo) {
        if (!reliabilityDaysByWorker[wId]) {
          reliabilityDaysByWorker[wId] = new Set();
        }
        reliabilityDaysByWorker[wId].add(date.toDateString());
      }

      // pending by worker
      if (!a.isSettled) {
        if (!pendingByWorker[wId]) {
          pendingByWorker[wId] = {
            workerId: wId,
            attendanceTotal: 0,
            advancesTotal: 0,
            extrasTotal: 0,
          };
        }
        pendingByWorker[wId].attendanceTotal += total;
      }
    });

    // 5) Advances
    advances.forEach((adv) => {
      const wId = adv.workerId?.toString();
      if (!workerMap[wId]) return;

      const amt = adv.amount || 0;
      allTimeTotals.advancesTotal += amt;

      if (!adv.isSettled) {
        if (!pendingByWorker[wId]) {
          pendingByWorker[wId] = {
            workerId: wId,
            attendanceTotal: 0,
            advancesTotal: 0,
            extrasTotal: 0,
          };
        }
        pendingByWorker[wId].advancesTotal += amt;
      }
    });

    // 6) Extras
    extras.forEach((ex) => {
      const wId = ex.workerId?.toString();
      if (!workerMap[wId]) return;

      const price = ex.price || 0;
      allTimeTotals.extrasTotal += price;

      if (!ex.isSettled) {
        if (!pendingByWorker[wId]) {
          pendingByWorker[wId] = {
            workerId: wId,
            attendanceTotal: 0,
            advancesTotal: 0,
            extrasTotal: 0,
          };
        }
        pendingByWorker[wId].extrasTotal += price;
      }
    });

    // 7) Pending totals
    let pendingAttendanceTotal = 0;
    let pendingAdvancesTotal = 0;
    let pendingExtrasTotal = 0;

    const pendingPerWorker = Object.values(pendingByWorker).map((row) => {
      pendingAttendanceTotal += row.attendanceTotal;
      pendingAdvancesTotal += row.advancesTotal;
      pendingExtrasTotal += row.extrasTotal;

      const netPending =
        row.attendanceTotal - row.advancesTotal - row.extrasTotal;

      return {
        workerId: row.workerId,
        name: workerMap[row.workerId]?.name || "Worker",
        attendanceTotal: row.attendanceTotal,
        advancesTotal: row.advancesTotal,
        extrasTotal: row.extrasTotal,
        netPending,
      };
    });

    const netPendingTotal =
      pendingAttendanceTotal - pendingAdvancesTotal - pendingExtrasTotal;

    // 8) Top workers by wages
    const topWorkersByWages = Object.entries(wagesByWorker)
      .map(([id, totalNet]) => ({
        workerId: id,
        name: workerMap[id]?.name || "Worker",
        totalNet,
      }))
      .sort((a, b) => b.totalNet - a.totalNet)
      .slice(0, 7);

    // 9) Top workers by hours
    const topWorkersByHours = Object.entries(hoursByWorker)
      .map(([id, hours]) => ({
        workerId: id,
        name: workerMap[id]?.name || "Worker",
        hours,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 7);

    // 10) Weekly / daily attendance trend array (last 30 days)
    const weeklyAttendanceTrend = Object.entries(attendanceByDay)
      .map(([day, hours]) => {
        const d = new Date(day);
        return {
          dateKey: day,
          label: d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          hours,
        };
      })
      .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey));

    // 11) Attendance reliability (last 30 days)
    const daysWindow = 30;
    const attendanceReliability = Object.entries(reliabilityDaysByWorker)
      .map(([id, set]) => {
        const presentDays = set.size;
        const reliability = (presentDays / daysWindow) * 100;
        return {
          workerId: id,
          name: workerMap[id]?.name || "Worker",
          presentDays,
          reliability, // %
        };
      })
      .sort((a, b) => b.reliability - a.reliability)
      .slice(0, 7);

    // 12) Advance-heavy workers (ratio advances / attendance)
    const advanceHeavyWorkers = pendingPerWorker
      .map((row) => {
        const totalAttendance =
          (row.attendanceTotal || 0) + (wagesByWorker[row.workerId] || 0); // approx
        const totalAdvances = row.advancesTotal || 0;
        const ratio =
          totalAttendance > 0 ? (totalAdvances / totalAttendance) * 100 : 0;

        return {
          workerId: row.workerId,
          name: row.name,
          totalAttendance,
          totalAdvances,
          ratio,
        };
      })
      .filter((r) => r.totalAttendance > 0 && r.totalAdvances > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 7);

    // 13) Workers overdue settlement:
    // Having pending > 0 AND last settlement older than 30 days (or no settlement)
    const workersOverdueSettlement = pendingPerWorker
      .filter((row) => row.netPending > 0)
      .map((row) => {
        const last = lastSettlementByWorker[row.workerId];
        let daysSinceLast = null;
        if (last) {
          const diffMs = today - last;
          daysSinceLast = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }
        return {
          workerId: row.workerId,
          name: row.name,
          netPending: row.netPending,
          lastSettlementDate: last || null,
          daysSinceLast,
        };
      })
      .filter((r) => !r.lastSettlementDate || r.daysSinceLast > 30)
      .sort((a, b) => (b.netPending || 0) - (a.netPending || 0));

    return res.status(200).json({
      msg: "Insights overview fetched",
      data: {
        pendingTotals: {
          attendanceTotal: pendingAttendanceTotal,
          advancesTotal: pendingAdvancesTotal,
          extrasTotal: pendingExtrasTotal,
          netPending: netPendingTotal,
        },
        totalSettledNet,
        monthlyWageTrend,
        breakdownAllTime: allTimeTotals,
        topWorkersByWages,
        topWorkersByHours,
        pendingPerWorker,
        advanceHeavyWorkers,
        weeklyAttendanceTrend,
        attendanceReliability,
        workersOverdueSettlement,
      },
    });
  } catch (error) {
    console.error("Error in getFarmerInsightsOverview:", error);
    return res
      .status(500)
      .json({ msg: "Error while fetching insights overview" });
  }
};
