import Worker from "../models/Worker.js";

export const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({ farmerId: req.user.id });
    if (workers) {
      return res
        .status(200)
        .json({ msg: "Workers Fetched Successfully", workers });
    }
  } catch (error) {
    console.log("Error getting Workers: ", error);
    return res.status(500).json({ msg: "Error in Getting Workers" });
  }
};

export const createWorker = async (req, res) => {
  try {
    const { name, remarks } = req.body;
    if (!name) {
      return res.json({ msg: "Enter worker Name" });
    }
    const newWorker = await Worker.create({
      name: name,
      farmerId: req.user.id,
      status: "active",
      remarks: remarks,
    });

    return res.status(200).json({ msg: "Worker Created", newWorker });
  } catch (error) {
    console.log("Error creating Worker: ", error);
    return res.status(500).json({ msg: "Error in creating worker" });
  }
};

export const updateWorker = async (req, res) => {
  try {
    const { name, status, remarks } = req.body;
    const workerId = req.params.id;
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() === req.user.id) {
      const updatedWorker = await Worker.findByIdAndUpdate(
        workerId,
        {
          name: name,
          status: status,
          remarks: remarks,
        },
        { new: true }
      );
      return res.status(200).json({ msg: "Worker Updated", updatedWorker });
    }
    return res.status(403).json({ msg: "Error in updating worker" });
  } catch (error) {
    console.log("Error editing worker: ", error);
    return res.status(500).json({ msg: "Error in Editing Worker" });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const workerId = req.params.id;
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ msg: "Worker not found" });
    }

    if (worker.farmerId.toString() === req.user.id) {
      const deleteWorkerById = await Worker.findByIdAndDelete(workerId);
      return res.status(200).json({ msg: "Worker Deleted", deleteWorkerById });
    }

    return res
      .status(403)
      .json({ msg: "Not authorized to delete this worker" });
  } catch (error) {
    console.log("Error deleting worker: ", error);
    return res.status(500).json({ msg: "Error in Deleting Worker" });
  }
};
