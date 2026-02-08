import mongoose from "mongoose";

const SettlementSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Breakdown
    attendanceTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    extrasTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    advancesTotal: {
      type: Number,
      required: true,
      default: 0,
    },

    // Net = attendance - extras - advances
    netAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
    },
    walletDeposit: {
      type: Number,
    },

    // A: with note
    note: {
      type: String,
      default: "",
    },

    // Optional: store farmer for faster Summary tab queries
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
  },
  { timestamps: true },
);

SettlementSchema.index({ farmerId: 1, createdAt: -1 });

const Settlement = mongoose.model("Settlement", SettlementSchema);

export default Settlement;
