import mongoose from "mongoose";

const AdvanceSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      default: null,
    },
  },
  { timestamps: true }
);

const Advance = mongoose.model("Advance", AdvanceSchema);

export default Advance;
