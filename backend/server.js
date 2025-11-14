import express from "express";
import env from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import workerRoutes from "./routes/worker.route.js";

env.config();
connectDB();
const PORT = process.env.PORT;
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ msg: "Welcome to WMS" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workers", workerRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ` + PORT);
});
