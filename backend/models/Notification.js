import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "overdue",
        "summary",
        "analytics",
        "ai",
        "marketing",
        "engagement",
      ],
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Flexible object for extra data
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
