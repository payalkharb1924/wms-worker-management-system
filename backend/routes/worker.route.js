import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  deleteWorker,
  updateWorker,
  getWorkers,
  createWorker,
} from "../controller/worker.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getWorkers);
router.post("/", authMiddleware, createWorker);
router.put("/:id", authMiddleware, updateWorker);
router.delete("/:id", authMiddleware, deleteWorker);

export default router;
