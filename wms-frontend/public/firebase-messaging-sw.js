importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js"
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

  const { title, body } = payload.notification || {};

  const options = {
    body,
    icon: "/logo-192.png", // app logo
    badge: "/badge.png", // small monochrome icon
    image: "/logo-512.png", // large image (optional)
    vibrate: [100, 50, 100],
    data: {
      click_action: payload.data?.click_action || "https://mywms.pages.dev",
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.click_action;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
