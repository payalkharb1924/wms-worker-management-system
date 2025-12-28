import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import workerRoutes from "./routes/worker.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import advanceRoutes from "./routes/advance.route.js";
import extraRoutes from "./routes/extra.route.js";
import settlementRoutes from "./routes/settlement.route.js";
import insightsRoutes from "./routes/insights.routes.js";
import notificationsRoutes from "./routes/notifications.route.js";
import cors from "cors";

connectDB();

// Start notification scheduler
import "./schedulers/notificationScheduler.js";

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
app.use("/api/settlement", settlementRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/notifications", notificationsRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ` + PORT);
});
