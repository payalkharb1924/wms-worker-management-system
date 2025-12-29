import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createExtra,
  getExtrasByWorker,
  getExtrasByDateRange,
  updateExtra,
  deleteExtra,
} from "../controller/extra.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createExtra);
router.put("/:id", authMiddleware, updateExtra);
router.delete("/:id", authMiddleware, deleteExtra);
router.get("/worker/:workerId", authMiddleware, getExtrasByWorker);
router.get("/", authMiddleware, getExtrasByDateRange);

// * ---------------- BOT QUERY ROUTE ---------------- */
router.post("/bot-query", authMiddleware, async (req, res) => {
  const { filters, aggregation } = req.body;

  try {
    // Reuse existing controller logic indirectly via date range
    const data = await getExtrasByDateRange(
      { query: filters, user: req.user },
      {
        json: (result) => result,
      }
    );

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch extras data" });
  }
});

export default router;
