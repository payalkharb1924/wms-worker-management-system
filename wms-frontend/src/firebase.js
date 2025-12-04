import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCDFFqHE7U2Cvo8JhxX49UxGuZet1kOzw8",
  authDomain: "wms-worker-management-system.firebaseapp.com",
  projectId: "wms-worker-management-system",
  storageBucket: "wms-worker-management-system.firebasestorage.app",
  messagingSenderId: "1077251697662",
  appId: "1:1077251697662:web:3dbb1d38931b6127e56eaf",
  measurementId: "G-3TTFPK7TKH",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey:
          "BDQ_JTCChYpHexpb3nQxsoeW6Are40lgl8Kv_AltLnK-isl0TJLUOibGvDPuAXjLQda-mUZT7peQXrtW76ZGVcA",
      });

      console.log("📲 FCM Token:", token);
      return token;
    } else {
      console.warn("Notification permission denied!");
      return null;
    }
  } catch (err) {
    console.error("Token Error:", err);
    return null;
  }
};
