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

export default router;
