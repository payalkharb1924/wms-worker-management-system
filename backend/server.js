import express from "express";
import env from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import workerRoutes from "./routes/worker.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import advanceRoutes from "./routes/advance.route.js";
import extraRoutes from "./routes/extra.route.js";
import cors from "cors";

env.config();
connectDB();
const PORT = process.env.PORT;
const app = express();

app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ msg: "Welcome to WMS" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/advance", advanceRoutes);
app.use("/api/extra", extraRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ` + PORT);
});
