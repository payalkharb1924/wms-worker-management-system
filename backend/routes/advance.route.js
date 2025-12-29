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

/* ---------------- BOT QUERY ROUTE ---------------- */
router.post("/bot-query", authMiddleware, async (req, res) => {
  try {
    const { fields, filters, aggregation } = req.body;

    // Aggregation support (LangGraph driven)
    if (aggregation?.pipeline) {
      const data = await Advance.aggregate(aggregation.pipeline);
      return res.json({ data });
    }

    // Normal query
    const query = filters || {};
    const projection = Array.isArray(fields) ? fields.join(" ") : undefined;

    const data = await Advance.find(query, projection).lean();
    return res.json({ data });
  } catch (err) {
    console.error("❌ Advance bot-query error:", err);
    res.status(500).json({ error: "Advance bot query failed" });
  }
});

export default router;
