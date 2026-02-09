importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCDFFqHE7U2Cvo8JhxX49UxGuZet1kOzw8",
  authDomain: "wms-worker-management-system.firebaseapp.com",
  projectId: "wms-worker-management-system",
  messagingSenderId: "1077251697662",
  appId: "1:1077251697662:web:3dbb1d38931b6127e56eaf",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);
  // Build notification content and show it explicitly so we can control the icon/badge.
  // Prefer notification fields, then data fields, then fall back to app icons in /public.
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "Notification";
  const body = notification.body || data.body || "You have a new message";

  const options = {
    body,
    icon: notification.icon || data.icon || "/icon-192.png",
    badge: notification.badge || data.badge || "/icon-192.png",
    image: notification.image || data.image || "/icon-512.png",
    data: {
      ...(data || {}),
      click_action:
        notification.click_action ||
        data.click_action ||
        data.click_action ||
        "./",
    },
    vibrate: [100, 50, 100],
  };

  // Show the notification (will replace any FCM auto-notification and allow custom icon)
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.click_action;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
