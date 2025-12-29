import express from "express";
import {
  createAttendance,
  updateAttendance,
  getAttendanceByWorker,
  getAttendanceByDateRange,
  deleteAttendance,
} from "../controller/attendance.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/add", authMiddleware, createAttendance);
router.put("/:id", authMiddleware, updateAttendance);
router.get("/worker/:workerId", authMiddleware, getAttendanceByWorker);
router.get("/range", authMiddleware, getAttendanceByDateRange);
router.delete("/:id", authMiddleware, deleteAttendance);

/* ---------------- BOT QUERY ROUTE ---------------- */
router.post("/bot-query", authMiddleware, async (req, res) => {
  try {
    const { fields, filters, aggregation } = req.body;

    // Aggregation support (for "who is present today", counts, etc.)
    if (aggregation?.pipeline) {
      const data = await Attendance.aggregate(aggregation.pipeline);
      return res.json({ data });
    }

    // Normal filtered query
    const query = filters || {};
    const projection = Array.isArray(fields) ? fields.join(" ") : undefined;

    const data = await Attendance.find(query, projection).lean();
    return res.json({ data });
  } catch (err) {
    console.error("❌ Attendance bot-query error:", err);
    res.status(500).json({ error: "Attendance bot query failed" });
  }
});

export default router;
