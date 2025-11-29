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
      default: Date.now,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
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
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    hoursWorked: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    remarks: {
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

AttendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);

export default Attendance;
