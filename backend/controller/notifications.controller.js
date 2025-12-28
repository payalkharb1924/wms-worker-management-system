import { sendPushNotification } from "../utils/notifications.js";
import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import { sendNotificationToUser } from "../services/notificationService.js";

/**
 * Test route to send a push notification.
 * Expects: { fcmToken, title, body }
 */
export const testNotification = async (req, res) => {
  const { fcmToken, title, body } = req.body;

  if (!fcmToken || !title || !body) {
    return res
      .status(400)
      .json({ error: "Missing required fields: fcmToken, title, body" });
  }

  const result = await sendPushNotification({ token: fcmToken, title, body });

  if (result.success) {
    res.status(200).json({
      message: "Notification sent successfully",
      messageId: result.messageId,
    });
  } else {
    res
      .status(500)
      .json({ error: "Failed to send notification", details: result.error });
  }
};

// GET /api/notifications - Get user's notifications with pagination
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id; // Assuming auth middleware sets req.user

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/notifications/:id/read - Mark as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/notifications/tokens - Save device token
export const saveDeviceToken = async (req, res) => {
  try {
    const { token, deviceInfo } = req.body;
    const userId = req.user.id;

    const existing = await DeviceToken.findOne({ token });

    if (existing) {
      existing.isActive = true; // 👈 IMPORTANT
      await existing.save();
      return res.json({ message: "Token re-activated" });
    }

    const deviceToken = new DeviceToken({ userId, token, deviceInfo });
    await deviceToken.save();

    res.status(201).json({ message: "Token saved" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const title = "🧪 Test Notification";
    const body = "This is a test notification to verify FCM setup.";
    await sendNotificationToUser(userId, title, body, "marketing", {});
    res.json({ message: "Test notification sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TEMPORARY: Manual triggers for testing (remove after confirmation)
export const triggerOverdueCheck = async (req, res) => {
  try {
    const { checkOverdueSettlements } = await import(
      "../services/notificationService.js"
    );
    await checkOverdueSettlements();
    res.json({ message: "Overdue check triggered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerDailySummary = async (req, res) => {
  try {
    const { generateDailySummary } = await import(
      "../services/notificationService.js"
    );
    await generateDailySummary();
    res.json({ message: "Daily summary triggered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerAnalyticsCheck = async (req, res) => {
  try {
    const { checkAnalytics } = await import(
      "../services/notificationService.js"
    );
    await checkAnalytics();
    res.json({ message: "Analytics check triggered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerAISuggestions = async (req, res) => {
  try {
    const { generateAISuggestions } = await import(
      "../services/notificationService.js"
    );
    await generateAISuggestions();
    res.json({ message: "AI suggestions triggered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerEngagement = async (req, res) => {
  try {
    const { sendEngagementNotification } = await import(
      "../services/notificationService.js"
    );
    await sendEngagementNotification();
    res.json({ message: "Engagement notifications sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerFarmingHack = async (req, res) => {
  try {
    const { sendDailyFarmingHack } = await import(
      "../services/notificationService.js"
    );
    await sendDailyFarmingHack();
    res.json({ message: "Farming hack sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/notifications/tokens/disable
export const disableDeviceTokens = async (req, res) => {
  try {
    const userId = req.user.id;

    await DeviceToken.updateMany({ userId }, { $set: { isActive: false } });

    res.json({ message: "Notifications disabled for this user" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/notifications/tokens/status
export const getNotificationStatus = async (req, res) => {
  const userId = req.user.id;

  const activeToken = await DeviceToken.findOne({
    userId,
    isActive: true,
  });

  res.json({ enabled: !!activeToken });
};
