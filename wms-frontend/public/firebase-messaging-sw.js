importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
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
  console.log("📩 Background Msg:", payload);

  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
  });
});
