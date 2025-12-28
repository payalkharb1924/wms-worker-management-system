import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // 👈 IMPORTANT

await mongoose.connect(process.env.MONGO_URI);

const result = await mongoose.connection
  .collection("devicetokens")
  .updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });

console.log(result);
process.exit();
