import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createAdvance,
  getAdvancesByWorker,
  getAdvancesByDateRange,
  updateAdvance,
  deleteAdvance,
} from "../controller/advance.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createAdvance);
router.put("/:id", authMiddleware, updateAdvance);
router.delete("/:id", authMiddleware, deleteAdvance);
router.get("/worker/:workerId", authMiddleware, getAdvancesByWorker);
router.get("/", authMiddleware, getAdvancesByDateRange);

export default router;
