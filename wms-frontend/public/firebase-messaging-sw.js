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
  measurementId: "G-3TTFPK7TKH",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  if (payload.data?.appControlled !== "true") return;

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});
