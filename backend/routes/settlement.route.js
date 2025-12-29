// routes/settlement.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getWorkerPendingSummary,
  createSettlementForWorker,
  getWorkerSettlements,
  getFarmerSettlementsHistory,
  getWorkerLedger,
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

router.get("/worker/:workerId/ledger", authMiddleware, getWorkerLedger);

/* ---------------- BOT QUERY ROUTE ---------------- */
// POST /api/settlement/bot-query
router.post("/bot-query", authMiddleware, async (req, res) => {
  try {
    const { aggregation, filters } = req.body || {};

    // Let controller layer decide based on structured intent
    if (aggregation?.type === "pending_by_worker" && filters?.workerId) {
      req.params.workerId = filters.workerId;
      return getWorkerPendingSummary(req, res);
    }

    if (aggregation?.type === "ledger_by_worker" && filters?.workerId) {
      req.params.workerId = filters.workerId;
      return getWorkerLedger(req, res);
    }

    if (aggregation?.type === "farmer_history") {
      return getFarmerSettlementsHistory(req, res);
    }

    return res.status(400).json({
      error: "Unsupported settlement bot query",
    });
  } catch (err) {
    return res.status(500).json({ error: "Settlement bot query failed" });
  }
});

export default router;
