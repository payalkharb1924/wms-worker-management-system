import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import PublicRoute from "./components/PublicRoute";
import { messaging } from "./firebase";
import { onMessage } from "firebase/messaging";
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    onMessage(messaging, (payload) => {
      console.log("Foreground message:", payload);
      // FCM handles notification automatically, so don't show again
      // const { title, body, icon, image } = payload.data || {};
      // const finalTitle = title || "Notification";
      // const finalBody = body || "You have a new message";
      // new Notification(finalTitle, {
      //   body: finalBody,
      //   icon: icon || "/logo-192.png",
      //   image: image || "/logo-512.png",
      //   badge: "/badge.png",
      // });
    });
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </Provider>
  );
}
