import Extra from "../models/Extra.js";
import Worker from "../models/Worker.js";
import Settlement from "../models/Settlement.js";

const getLastSettledDate = async (workerId) => {
  const lastSettlement = await Settlement.findOne({ workerId })
    .sort({ endDate: -1 })
    .select("endDate")
    .lean();

  if (!lastSettlement) return null;

  const d = new Date(lastSettlement.endDate);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const createExtra = async (req, res) => {
  try {
    const { itemName, date, price, note, workerId } = req.body;
    if (!itemName || !date || !price || !workerId) {
      return res.status(400).json({ msg: "Missing Fields" });
    }
    const worker = await Worker.findById(workerId);
    if (!worker || worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    if (price !== undefined && price <= 0) {
      return res.status(400).json({ msg: "Enter valid price" });
    }
    const entryDate = new Date(`${date}T12:00:00.000Z`);

    const lastSettledDate = await getLastSettledDate(workerId);
    if (lastSettledDate && entryDate <= lastSettledDate) {
      return res.status(400).json({
        msg: `Cannot add extra before or on ${
          lastSettledDate.toISOString().split("T")[0]
        }`,
      });
    }

    const extra = await Extra.create({
      itemName,
      date: new Date(`${date}T12:00:00.000Z`),
      price,
      note,
      workerId,
    });
    return res.status(201).json({
      msg: "Extra created",
      extra,
    });
  } catch (error) {
    console.log("Error in creating extra", error);
    return res.status(500).json({ msg: "Error in creating extra" });
  }
};

export const getExtrasByWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "worker not found" });
    }
    if (worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    const extras = await Extra.find({ workerId: workerId }).sort({
      date: -1,
    });

    return res.status(200).json({
      msg: "Extras fetched successfully",
      extras,
    });
  } catch (error) {
    console.log("Error in getting extras by worker", error);
    return res.status(500).json({ msg: "Error in getting extras by worker" });
  }
};

export const getExtrasByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "Enter both start and end date" });
    }
    const workers = await Worker.find({ farmerId: req.user.id });
    const workerIds = workers.map((w) => w._id);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const extras = await Extra.find({
      workerId: { $in: workerIds },
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });
    return res.status(200).json({
      msg: "Extras fetched successfully by date range",
      extras,
    });
  } catch (error) {
    console.log("Error in getting extras by date range", error);
    return res
      .status(500)
      .json({ msg: "Error in getting extras by date range" });
  }
};

export const updateExtra = async (req, res) => {
  try {
    const { date, itemName, price, note } = req.body;
    const extraId = req.params.id;
    const extra = await Extra.findById(extraId);
    if (!extra) {
      return res.status(404).json({ msg: "Extra not found" });
    }
    const worker = await Worker.findById(extra.workerId);
    if (!worker || worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (price !== undefined && price <= 0) {
      return res.status(400).json({ msg: "Enter valid price" });
    }
    const entryDate = date
      ? new Date(`${date}T12:00:00.000Z`)
      : new Date(extra.date);

    const lastSettledDate = await getLastSettledDate(extra.workerId);
    if (lastSettledDate && entryDate <= lastSettledDate) {
      return res.status(400).json({
        msg: "Cannot edit extra from a settled period",
      });
    }

    const updatedExtra = await Extra.findByIdAndUpdate(
      extraId,
      {
        date: date ? new Date(`${date}T12:00:00.000Z`) : extra.date,
        itemName: itemName || extra.itemName,
        note: note || extra.note,
        price: price || extra.price,
      },
      { new: true }
    );

    return res.status(200).json({
      msg: "Extra updated successfully",
      updatedExtra,
    });
  } catch (error) {
    console.log("Error in updating extra", error);
    return res.status(500).json({ msg: "Error in updating extra" });
  }
};

export const deleteExtra = async (req, res) => {
  try {
    const extraId = req.params.id;
    const extra = await Extra.findById(extraId);
    if (!extra) {
      return res.status(404).json({ msg: "Extra not found" });
    }
    const worker = await Worker.findById(extra.workerId);
    if (!worker || worker.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    const entryDate = new Date(extra.date);
    entryDate.setHours(0, 0, 0, 0);

    const lastSettledDate = await getLastSettledDate(extra.workerId);
    if (lastSettledDate && entryDate <= lastSettledDate) {
      return res.status(400).json({
        msg: "Cannot delete extra from a settled period",
      });
    }

    await Extra.findByIdAndDelete(extraId);
    return res.status(200).json({
      msg: "Extra deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleting extra", error);
    return res.status(500).json({ msg: "Error in deleting extra" });
  }
};
