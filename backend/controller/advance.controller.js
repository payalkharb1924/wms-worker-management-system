import Worker from "../models/Worker.js";
import Advance from "../models/Advance.js";

export const createAdvance = async (req, res) => {
  try {
    const { workerId, date, amount, note } = req.body;
    if (!workerId || !date) {
      return res.status(400).json({ msg: "Missing fields" });
    }
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }
    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    if (amount <= 0) {
      return res.status(400).json({ msg: "Enter valid amount" });
    }
    const advanceDate = new Date(date);
    advanceDate.setHours(0, 0, 0, 0);
    const advance = await Advance.create({
      workerId,
      date,
      amount,
      note: note || "",
    });
    return res.status(201).json({
      msg: "Advance Created successfully",
      advance,
    });
  } catch (error) {
    console.log("Error in creating advance", error);
    return res.status(500).json({ msg: "Error in creating advance" });
  }
};

export const getAdvancesByWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const advances = await Advance.find({ workerId: workerId }).sort({
      date: -1,
    });
    return res.status(200).json({
      msg: "Advance Fetched successfully",
      advances,
    });
  } catch (error) {
    console.log("Error in getting advances by worker", error);
    return res.status(500).json({ msg: "Error in getting advances by worker" });
  }
};

export const getAdvancesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 59);

    const workers = await Worker.find({ farmerId: req.user.id });
    const workerIds = workers.map((w) => w._id);

    const advances = await Advance.find({
      workerId: { $in: workerIds },
      date: { $gte: start, $lte: end },
    });

    return res.status(200).json({
      msg: "Advance fetched by date range",
      advances,
    });
  } catch (error) {
    console.log("Error in getting advances by date range", error);
    return res
      .status(500)
      .json({ msg: "Error in getting advances by date range" });
  }
};

export const updateAdvance = async (req, res) => {
  try {
    const advanceId = req.params.id;
    const advance = await Advance.findById(advanceId);
    if (!advance) {
      return res.status(404).json({ msg: "Advance not found" });
    }
    const worker = await Worker.findById(advance.workerId);

    if (!worker || worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const { date, amount, note } = req.body;
    if (amount <= 0) {
      return res.status(400).json({ msg: "Enter valid amount" });
    }

    const updatedAdvance = await Advance.findByIdAndUpdate(
      advanceId,
      {
        date: date || advance.date,
        amount: amount || advance.amount,
        note: note || advance.note,
      },
      {
        new: true,
      }
    );
    return res.status(200).json({
      msg: "Advance updated successfully",
      updatedAdvance,
    });
  } catch (error) {
    console.log("Error in updating advance", error);
    return res.status(500).json({ msg: "Error in updating advance" });
  }
};

export const deleteAdvance = async (req, res) => {
  try {
    const advanceId = req.params.id;
    const advance = await Advance.findById(advanceId);
    if (!advance) {
      return res.status(404).json({ msg: "Advance not found" });
    }
    const worker = await Worker.findById(advance.workerId);
    if (!worker || worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    await Advance.findByIdAndDelete(advanceId);
    return res.status(200).json({ msg: "Advance deleted successfully" });
  } catch (error) {
    console.log("Error in deleting advance", error);
    return res.status(500).json({ msg: "Error in deleting advance" });
  }
};
