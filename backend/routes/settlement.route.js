// routes/settlement.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getWorkerPendingSummary,
  createSettlementForWorker,
  getWorkerSettlements,
  getFarmerSettlementsHistory,
} from "../controller/settlement.controller.js";

const router = express.Router();

// For worker details popup
router.get(
  "/worker/:workerId/pending",
  authMiddleware,
  getWorkerPendingSummary
);

// Create a settlement (used by "Settle Payment" popup)
router.post(
  "/worker/:workerId/settle",
  authMiddleware,
  createSettlementForWorker
);

// History for one worker
router.get("/worker/:workerId/history", authMiddleware, getWorkerSettlements);

// ✅ NEW: All settlements of this farmer (Summary tab -> History)
router.get("/farmer/history", authMiddleware, getFarmerSettlementsHistory);

export default router;
