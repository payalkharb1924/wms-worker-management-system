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
        icon: "https://mywms.pages.dev/logo-192.png",
        image: "https://mywms.pages.dev/logo-512.png",
        color: "#fe8216",
      },
      data: {
        click_action: "https://mywms.pages.dev/dashboard",
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
};
