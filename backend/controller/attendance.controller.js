import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";
import Settlement from "../models/Settlement.js";

// helper: get last settled date for worker
const getLastSettledDate = async (workerId) => {
  const lastSettlement = await Settlement.findOne({ workerId })
    .sort({ endDate: -1 })
    .select("endDate")
    .lean();

  if (!lastSettlement) return null;

  // DO NOT mutate hours
  return new Date(lastSettlement.endDate);
};

export const createAttendance = async (req, res) => {
  try {
    const {
      workerId,
      date,
      status,
      startTime,
      endTime,
      restMinutes = 0,
      missingMinutes = 0,
      rate,
      note,
      remarks,
      segments = [], // 👈 ADD THIS
    } = req.body;

    // basic validation
    if (!workerId || !date || !status) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const attendanceDate = new Date(`${date}T12:00:00.000Z`);

    // ❌ block backdated attendance after settlement
    const lastSettledDate = await getLastSettledDate(workerId);
    if (lastSettledDate && attendanceDate <= lastSettledDate) {
      return res.status(400).json({
        msg: "Cannot add attendance for settled period",
      });
    }

    // ❌ prevent duplicate
    const alreadyExist = await Attendance.findOne({
      workerId,
      date: attendanceDate,
    });

    if (alreadyExist) {
      return res
        .status(409)
        .json({ msg: "Attendance already exists for this date" });
    }

    // =========================
    // STATUS-BASED LOGIC
    // =========================

    if (status === "present" && segments.length) {
      let totalHours = 0;
      let totalAmount = 0;

      const computed = segments.map((s) => {
        let hrs = 0;

        // CASE 1: Hours provided directly
        if (Number(s.hoursWorked) > 0) {
          hrs = Number(s.hoursWorked);
        } else if (s.startTime && s.endTime) {
          const start = new Date(s.startTime);
          const end = new Date(s.endTime);

          if (isNaN(start) || isNaN(end)) {
            throw new Error("Invalid segment datetime");
          }

          if (end <= start) {
            throw new Error("Invalid segment time range");
          }

          hrs = Number(((end - start) / 3600000).toFixed(2));
        } else {
          throw new Error("Each segment needs hours or start/end time");
        }

        const amt = Number((hrs * s.rate).toFixed(2));

        totalHours += hrs;
        totalAmount += amt;

        const isTimeBased = !!(s.startTime && s.endTime);

        return {
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          hoursWorked: hrs,
          rate: s.rate,
          total: amt,
          mode: isTimeBased ? "time" : "hours",
        };
      });

      const attendance = await Attendance.create({
        workerId,
        date: attendanceDate,
        status,
        segments: computed,
        hoursWorked: totalHours,
        total: totalAmount,
        note,
        remarks,
      });

      return res.status(201).json(attendance);
    }

    let hoursWorked = 0;
    let total = 0;
    let finalStartTime = null;
    let finalEndTime = null;
    let finalRate = null;
    let finalNote = note || "";

    // 🔵 PRESENT
    if (status === "present") {
      if (!startTime || !endTime || !rate) {
        return res.status(400).json({
          msg: "Start time, end time and rate are required for present worker",
        });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        return res
          .status(400)
          .json({ msg: "End time must be greater than start time" });
      }

      const workedMinutes = (end - start) / (1000 * 60);
      const effectiveMinutes = workedMinutes - restMinutes - missingMinutes;

      if (effectiveMinutes < 0) {
        return res.status(400).json({ msg: "Invalid work time calculation" });
      }

      hoursWorked = Number((effectiveMinutes / 60).toFixed(2));
      total = Number((hoursWorked * rate).toFixed(2));

      finalStartTime = start;
      finalEndTime = end;
      finalRate = rate;
    }

    // 🔴 ABSENT
    if (status === "absent") {
      if (!note || !note.trim()) {
        return res
          .status(400)
          .json({ msg: "Note is required for absent worker" });
      }
    }

    // ⚫ INACTIVE
    if (status === "inactive") {
      finalNote = "Inactive";
    }

    const attendance = await Attendance.create({
      workerId,
      date: attendanceDate,
      status,
      startTime: finalStartTime,
      endTime: finalEndTime,
      restMinutes: status === "present" ? restMinutes : 0,
      missingMinutes: status === "present" ? missingMinutes : 0,
      rate: finalRate,
      note: finalNote,
      remarks,
      hoursWorked,
      total,
    });

    return res.status(201).json({
      msg: "Attendance created",
      attendance,
    });
  } catch (error) {
    console.error("Create Attendance Error", error);
    return res.status(500).json({ msg: "Error creating attendance" });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({ msg: "Attendance not found" });
    }

    const worker = await Worker.findById(attendance.workerId);
    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    if (attendance.isSettled) {
      return res.status(400).json({ msg: "Cannot edit settled attendance" });
    }

    const {
      status = attendance.status,
      segments,
      startTime,
      endTime,
      restMinutes = attendance.restMinutes,
      missingMinutes = attendance.missingMinutes,
      rate,
      note,
      remarks,
    } = req.body;

    // 🟢 UPDATE SPLIT ATTENDANCE
    if (status === "present" && segments?.length) {
      let totalHours = 0;
      let totalAmount = 0;

      const computed = segments.map((s) => {
        let hrs = 0;

        if (Number(s.hoursWorked) > 0) {
          hrs = Number(s.hoursWorked);
        } else if (s.startTime && s.endTime) {
          const start = new Date(s.startTime);
          const end = new Date(s.endTime);

          if (isNaN(start) || isNaN(end)) {
            throw new Error("Invalid segment datetime");
          }

          if (end <= start) {
            throw new Error("Invalid segment time range");
          }

          hrs = Number(((end - start) / 3600000).toFixed(2));
        } else {
          throw new Error("Each segment needs hours or start/end time");
        }

        const amt = Number((hrs * s.rate).toFixed(2));

        totalHours += hrs;
        totalAmount += amt;

        const isTimeBased = !!(s.startTime && s.endTime);

        return {
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          hoursWorked: hrs,
          rate: s.rate,
          total: amt,
          mode: isTimeBased ? "time" : "hours",
        };
      });

      attendance.status = "present";
      attendance.segments = computed;
      attendance.hoursWorked = totalHours;
      attendance.total = totalAmount;
      attendance.note = note ?? attendance.note;
      attendance.remarks = remarks ?? attendance.remarks;

      await attendance.save();

      const populated = await Attendance.findById(attendance._id).populate(
        "workerId",
        "name",
      );

      return res.json({
        msg: "Attendance updated",
        updatedAttendance: populated,
      });
    }

    let hoursWorked = 0;
    let total = 0;
    let finalStartTime = null;
    let finalEndTime = null;
    let finalRate = null;
    let finalNote = note ?? attendance.note;

    if (status === "present") {
      if (!startTime || !endTime || !rate) {
        return res.status(400).json({
          msg: "Start, end time and rate required for present worker",
        });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        return res
          .status(400)
          .json({ msg: "End time must be greater than start time" });
      }

      const workedMinutes = (end - start) / (1000 * 60);
      const effectiveMinutes = workedMinutes - restMinutes - missingMinutes;

      hoursWorked = Number((effectiveMinutes / 60).toFixed(2));
      total = Number((hoursWorked * rate).toFixed(2));

      finalStartTime = start;
      finalEndTime = end;
      finalRate = rate;
    }

    if (status === "absent" && (!finalNote || !finalNote.trim())) {
      return res.status(400).json({ msg: "Note required for absent worker" });
    }

    if (status === "inactive") {
      finalNote = "Inactive";
    }

    attendance.status = status;
    attendance.startTime = finalStartTime;
    attendance.endTime = finalEndTime;
    attendance.restMinutes = status === "present" ? restMinutes : 0;
    attendance.missingMinutes = status === "present" ? missingMinutes : 0;
    attendance.rate = finalRate;
    attendance.note = finalNote;
    attendance.remarks = remarks ?? attendance.remarks;
    attendance.hoursWorked = hoursWorked;
    attendance.total = total;

    await attendance.save();

    const populated = await Attendance.findById(attendance._id).populate(
      "workerId",
      "name",
    );

    return res.status(200).json({
      msg: "Attendance updated",
      updatedAttendance: populated,
    });
  } catch (error) {
    console.error("Update Attendance Error", error);
    return res.status(500).json({ msg: "Error updating attendance" });
  }
};

export const getAttendanceByWorker = async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }
    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    const attendance = await Attendance.find({ workerId })
      .populate("workerId", "name")
      .sort({ date: -1 });

    return res.status(200).json({
      msg: "Attendance fetched successfully",
      attendance,
    });
  } catch (error) {
    console.log("Error in Fetching Attendance by worker", error);
    return res.status(500).json({ msg: "Error in fetch Attendance by worker" });
  }
};

export const getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "Start and End date are required" });
    }
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // get all workers for this farmer
    const workers = await Worker.find({ farmerId: req.user.id });
    const workerIds = workers.map((w) => w._id);
    const attendance = await Attendance.find({
      workerId: { $in: workerIds },
      date: { $gte: start, $lte: end },
    })
      .populate("workerId", "name")
      .sort({ date: -1 });

    return res.status(200).json({
      msg: "Attendance fetched successfully",
      attendance,
    });
  } catch (error) {
    console.log("Error in Fetching Attendance by Date Range", error);
    return res
      .status(500)
      .json({ msg: "Error in fetch Attendance by date range" });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ msg: "Attendance not found" });
    }

    const worker = await Worker.findById(attendance.workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // ❌ prevent deleting settled attendance
    if (attendance.isSettled) {
      return res.status(400).json({
        msg: "Cannot delete attendance that is already settled",
      });
    }

    // ❌ prevent deleting attendance before last settlement
    const lastSettledDate = await getLastSettledDate(attendance.workerId);
    const attendanceDate = new Date(attendance.date);
    attendanceDate.setHours(0, 0, 0, 0);

    if (lastSettledDate && attendanceDate <= lastSettledDate) {
      return res.status(400).json({
        msg: "Cannot delete attendance from a settled period",
      });
    }

    await Attendance.findByIdAndDelete(attendanceId);

    return res.status(200).json({ msg: "Attendance deleted successfully" });
  } catch (error) {
    console.log("Error in Deleting Attendance", error);
    return res.status(500).json({ msg: "Error in deleting Attendance" });
  }
};
