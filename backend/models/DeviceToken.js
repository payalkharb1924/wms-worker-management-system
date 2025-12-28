import mongoose from "mongoose";

const DeviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceInfo: {
      type: String, // e.g., browser, OS
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

DeviceTokenSchema.index({ userId: 1 });

const DeviceToken = mongoose.model("DeviceToken", DeviceTokenSchema);

export default DeviceToken;
