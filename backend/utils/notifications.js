import admin from "../config/firebase.js";

/**
 * Sends a push notification to a single device token using Firebase Cloud Messaging.
 * @param {string} token - The FCM device token.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body.
 * @param {object} data - Optional additional data payload.
 * @returns {Promise<object>} - The response from FCM or an error.
 */
export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data, // Optional data payload
    };

    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
};
