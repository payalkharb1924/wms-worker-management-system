// routes/insights.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getFarmerInsightsOverview } from "../controller/insights.controller.js";

const router = express.Router();

// GET /api/insights/overview
router.get("/overview", authMiddleware, getFarmerInsightsOverview);

/* ---------------- BOT QUERY ROUTE ---------------- */
// POST /api/insights/bot-query
router.post("/bot-query", authMiddleware, async (req, res) => {
  try {
    // Reuse overview logic for analytical / summary queries
    return getFarmerInsightsOverview(req, res);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch insights data" });
  }
});

export default router;
