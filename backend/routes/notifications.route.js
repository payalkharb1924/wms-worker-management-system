import express from "express";
import {
  testNotification,
  getNotifications,
  markAsRead,
  saveDeviceToken,
  triggerOverdueCheck,
  triggerDailySummary,
  triggerAnalyticsCheck,
  triggerAISuggestions,
  triggerTestNotification,
  triggerEngagement,
  triggerFarmingHack,
  disableDeviceTokens,
  getNotificationStatus,
} from "../controller/notifications.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST /api/notifications/test
router.post("/test", testNotification);

// Protected routes
router.use(authMiddleware);

// GET /api/notifications
router.get("/", getNotifications);

// PATCH /api/notifications/:id/read
router.patch("/:id/read", markAsRead);

// POST /api/notifications/tokens
router.post("/tokens", saveDeviceToken);

// TEMPORARY: Manual triggers for testing (remove after confirmation)
router.post("/trigger-overdue", triggerOverdueCheck);
router.post("/trigger-summary", triggerDailySummary);
router.post("/trigger-analytics", triggerAnalyticsCheck);
router.post("/trigger-ai", triggerAISuggestions);
router.post("/trigger-engagement", triggerEngagement);
router.post("/trigger-hack", triggerFarmingHack);
router.post("/trigger-test", triggerTestNotification);
router.post("/tokens/disable", disableDeviceTokens);
router.get("/tokens/status", getNotificationStatus);

export default router;
