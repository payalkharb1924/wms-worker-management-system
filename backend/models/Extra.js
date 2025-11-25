import mongoose from "mongoose";

const ExtraSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Extra = mongoose.model("Extra", ExtraSchema);

export default Extra;
