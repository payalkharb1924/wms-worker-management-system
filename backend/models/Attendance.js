import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: ["present", "absent", "inactive"],
      required: true,
      default: "present",
    },

    // work details (ONLY for present)
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    restMinutes: {
      type: Number,
      default: 0,
    },
    missingMinutes: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      default: null,
    },

    note: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    hoursWorked: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
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
  { timestamps: true },
);

// 🔒 one entry per worker per day
AttendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", AttendanceSchema);
