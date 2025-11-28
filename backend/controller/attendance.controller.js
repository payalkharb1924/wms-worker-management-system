import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";

export const createAttendance = async (req, res) => {
  try {
    const {
      workerId,
      date,
      startTime,
      endTime,
      restMinutes = 0,
      missingMinutes = 0,
      rate,
      note,
      remarks,
    } = req.body;
    if (!workerId || !date || !startTime || !endTime || !rate) {
      return res.status(400).json({ msg: "Missing fields" });
    }
    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(400).json({ msg: "Worker not found" });
    if (worker.farmerId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to create Attendance" });
    }
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    // This ensures:
    //     2025-11-15 5 PM
    //     2025-11-15 1 AM
    //     Are considered same date.
    const alreadyExist = await Attendance.findOne({
      workerId,
      date: attendanceDate,
    });
    if (alreadyExist) {
      return res
        .status(409)
        .json({ msg: "Attendance already exists for this date" });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res
        .status(400)
        .json({ msg: "End time must be greater than start time" });
    }
    if (restMinutes < 0 || missingMinutes < 0) {
      return res.status(400).json({ msg: "Invalid rest/missing minutes" });
    }

    const workedMinutes = (end - start) / (1000 * 60); // minutes
    const effectiveMinutes = workedMinutes - restMinutes - missingMinutes;
    if (effectiveMinutes < 0) {
      return res.status(400).json({ msg: "Invalid (negative work time)" });
    }
    const hoursWorked = Number((effectiveMinutes / 60).toFixed(2));
    const total = Number((hoursWorked * rate).toFixed(2));
    const attendance = await Attendance.create({
      workerId,
      date: attendanceDate,
      startTime,
      endTime,
      restMinutes,
      missingMinutes,
      rate,
      note,
      remarks,
      hoursWorked,
      total,
    });

    return res.status(201).json({
      msg: "Attendance created",
      attendance,
    });
  } catch (error) {
    console.log("Error in Creating Attendance", error);
    return res.status(501).json({ msg: "Error in create Attendance" });
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
      return res.status(403).json({ msg: "Unauthorized to update Attendance" });
    }
    const startTime = req.body.startTime || attendance.startTime;
    const endTime = req.body.endTime || attendance.endTime;
    const restMinutes = req.body.restMinutes ?? attendance.restMinutes;
    const missingMinutes = req.body.missingMinutes ?? attendance.missingMinutes;
    const rate = req.body.rate || attendance.rate;
    const note = req.body.note ?? attendance.note;
    const remarks = req.body.remarks ?? attendance.remarks;

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res
        .status(400)
        .json({ msg: "End time must be greater than start time" });
    }
    if (restMinutes < 0 || missingMinutes < 0) {
      return res.status(400).json({ msg: "Invalid rest/missing minutes" });
    }
    const workedMinutes = (end - start) / (1000 * 60);
    const effectiveMinutes = workedMinutes - restMinutes - missingMinutes;
    if (effectiveMinutes < 0) {
      return res.status(400).json({ msg: "Invalid (negative work time)" });
    }
    const hoursWorked = Number((effectiveMinutes / 60).toFixed(2));
    const total = Number((hoursWorked * rate).toFixed(2));
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      {
        startTime,
        endTime,
        restMinutes,
        missingMinutes,
        rate,
        note,
        remarks,
        total,
        hoursWorked,
      },
      { new: true }
    );

    const populatedUpdated = await Attendance.findById(
      updatedAttendance._id
    ).populate("workerId", "name");

    return res.status(200).json({
      msg: "Attendance Updated",
      updatedAttendance: populatedUpdated,
    });
  } catch (error) {
    console.log("Error in Updating Attendance", error);
    return res.status(501).json({ msg: "Error in update Attendance" });
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
    end.setHours(29, 59, 59, 999);

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

    await Attendance.findByIdAndDelete(attendanceId);

    return res.status(200).json({ msg: "Attendance deleted successfully" });
  } catch (error) {
    console.log("Error in Deleting Attendance", error);
    return res.status(500).json({ msg: "Error in deleting Attendance" });
  }
};
