// routes/settlement.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getWorkerPendingSummary,
  createSettlementForWorker,
  getWorkerSettlements,
  getFarmerSettlementsHistory,
  getWorkerLedger,
  getWorkerLastSettlement,
  getWorkerMonthWiseSummary,
  createMonthWiseSettlement,
  generateMonthWisePDF,
} from "../controller/settlement.controller.js";
import { withdrawFromWallet } from "../controller/wallet.controller.js";

const router = express.Router();

// For worker details popup
router.get(
  "/worker/:workerId/pending",
  authMiddleware,
  getWorkerPendingSummary,
);

// Create a settlement (used by "Settle Payment" popup)
router.post(
  "/worker/:workerId/settle",
  authMiddleware,
  createSettlementForWorker,
);

// History for one worker
router.get("/worker/:workerId/history", authMiddleware, getWorkerSettlements);

// ✅ NEW: All settlements of this farmer (Summary tab -> History)
router.get("/farmer/history", authMiddleware, getFarmerSettlementsHistory);

router.get("/worker/:workerId/ledger", authMiddleware, getWorkerLedger);

// Month-wise settlement routes
router.get(
  "/worker/:workerId/last-settlement",
  authMiddleware,
  getWorkerLastSettlement,
);
router.get(
  "/worker/:workerId/month-wise-summary",
  authMiddleware,
  getWorkerMonthWiseSummary,
);
router.post(
  "/worker/:workerId/month-wise-settle",
  authMiddleware,
  createMonthWiseSettlement,
);
router.get(
  "/worker/:workerId/month-wise-pdf",
  authMiddleware,
  generateMonthWisePDF,
);

router.post(
  "/worker/:workerId/wallet-withdraw",
  authMiddleware,
  withdrawFromWallet,
);

export default router;
