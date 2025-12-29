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

/* ---------------- BOT QUERY ROUTE ---------------- */
// POST /api/workers/bot-query
router.post("/bot-query", authMiddleware, async (req, res) => {
  try {
    const { aggregation, filters } = req.body || {};

    // Example: how many workers I have
    if (aggregation?.type === "count") {
      return getWorkers(req, res);
    }

    // Example: list workers (used for presence / comparison later)
    if (aggregation?.type === "list") {
      return getWorkers(req, res);
    }

    return res.status(400).json({
      error: "Unsupported worker bot query",
    });
  } catch (err) {
    return res.status(500).json({ error: "Worker bot query failed" });
  }
});

export default router;
