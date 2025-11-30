// routes/insights.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getFarmerInsightsOverview } from "../controller/insights.controller.js";

const router = express.Router();

// GET /api/insights/overview
router.get("/overview", authMiddleware, getFarmerInsightsOverview);

export default router;
