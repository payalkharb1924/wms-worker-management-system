import mongoose from "mongoose";

const WorkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Worker = mongoose.model("Worker", WorkerSchema);

export default Worker;
