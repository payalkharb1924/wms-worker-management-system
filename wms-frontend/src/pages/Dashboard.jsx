import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";
import { loadUser } from "../features/auth/authActions";
import { useNavigate } from "react-router-dom";
import WorkersTab from "../components/WorkersTab.jsx";
import AttendanceTab from "../components/AttendanceTab.jsx";
import AdvancesTab from "../components/AdvancesTab.jsx";
import ExtrasTab from "../components/ExtrasTab.jsx";
import SummaryTab from "../components/SummaryTab.jsx";
import { createDashboardTour } from "../tour/useShepherdTour";
import { createAttendanceTour } from "../tour/useAttendanceTour.js";
import { createAdvanceTabIntroTour } from "../tour/advanceTabIntroTour";
import { createAdvanceTour } from "../tour/advancesTour";
import { requestNotificationPermission, messaging } from "../firebase.js";
import { onMessage } from "firebase/messaging";
import axios from "../api/axios.js";
import { LogOut, Settings, Bell, X, Check, Menu } from "lucide-react";

const Dashboard = () => {
  const { user, token } = useSelector((state) => state.auth);

  const tabs = ["Workers", "Attendance", "Advances", "Extras", "Summary"];

  const [activeTab, setActiveTab] = useState("Workers");
  const [menuOpen, setMenuOpen] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    Notification.permission === "granted",
  );

  const menuRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && token) {
      dispatch(loadUser());
    }
  }, [user, token, dispatch]);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      // 🔒 App-level gate
      const enabled = localStorage.getItem("notifications_enabled") === "true";
      if (!enabled) {
        console.log("🔕 Notifications disabled (foreground)");
        return;
      }

      if (Notification.permission === "granted") {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: "/assets/icons/icon-192.png",
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (token && !localStorage.getItem("tour.dashboard.completed")) {
      const tour = createDashboardTour({ setActiveTab });
      setTimeout(() => tour.start(), 300);
    }
  }, [token]);

  useEffect(() => {
    if (!("Notification" in window)) return;

    const dismissed = localStorage.getItem("notifications_prompt_dismissed");

    if (Notification.permission === "default" && !dismissed) {
      setShowNotificationPrompt(true);
    }

    if (Notification.permission === "granted") {
      axios.get("/notifications/tokens/status").then(async (res) => {
        if (!res.data.enabled) return; // respect user disable

        const token = await requestNotificationPermission();
        if (!token) return;

        await axios.post("/notifications/tokens", {
          token,
          deviceInfo: navigator.userAgent,
        });
      });
    }
  }, []);
  useEffect(() => {
    axios
      .get("/notifications/tokens/status")
      .then((res) => {
        setNotificationsEnabled(res.data.enabled);
      })
      .catch(() => {
        setNotificationsEnabled(false);
      });
  }, []);

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem("tour.advance.intro.completed")) return;

      const tour = createAdvanceTabIntroTour({ setActiveTab });
      setTimeout(() => tour.start(), 300);
    };

    window.addEventListener("demo:start-advance-intro", handler);
    return () =>
      window.removeEventListener("demo:start-advance-intro", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem("tour.extra.completed")) return;

      setActiveTab("Extras");

      setTimeout(() => {
        window.dispatchEvent(new Event("demo:start-extra-tour"));
      }, 400);
    };

    window.addEventListener("demo:advance-tour-finished", handler);
    return () =>
      window.removeEventListener("demo:advance-tour-finished", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem("tour.summary.completed")) return;

      setActiveTab("Summary");

      setTimeout(() => {
        window.dispatchEvent(new Event("demo:start-summary-tour"));
      }, 400);
    };

    window.addEventListener("demo:extra-tour-finished", handler);
    return () =>
      window.removeEventListener("demo:extra-tour-finished", handler);
  }, []);

  const handleLogout = () => {
    // TODO
    window.__attendanceTourStarted = false;
    dispatch(logout());
    navigate("/login");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);


  return (
    <div className="min-h-screen primary-bg p-5 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center text-white mb-3">
        <div>
          <h2 className="text-2xl font-bold">
            Hi! {user?.name || "Farmer"} 👋
          </h2>
          <p className="opacity-70">Welcome to Dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="w-10 h-10 flex items-center justify-center bg-black/10 rounded-lg"
            >
              <span className="text-2xl">
                <Menu />
              </span>
            </button>
            {/* Dropdown */}
            {menuOpen && (
              <div
                className="fixed right-5 top-20 w-44 
  bg-white/90 backdrop-blur-md
  border border-white/30
  text-black shadow-xl rounded-xl p-2
  z-[9999]"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSettings(true);
                    e.stopPropagation();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5"
                >
                  <Settings size={18} />
                  Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 text-red-600"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scroll-hide pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              handleTabChange(tab);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap
      ${tab === "Workers" ? "tab-workers" : ""}
      ${tab === "Attendance" ? "tab-attendance" : ""}
      ${tab === "Advances" ? "tab-advances" : ""}
      ${tab === "Extras" ? "tab-extras" : ""}
      ${tab === "Summary" ? "tab-summary" : ""}
      ${
        activeTab === tab
          ? "bg-white primary-font shadow-md"
          : "bg-black/10 text-white"
      }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div
        className="bg-white mt-1 rounded-xl p-4 shadow-md 
  flex-1 overflow-y-auto max-h-[calc(100vh-190px)] relative scroll-smooth no-scrollbar min-h-[450px]"
      >
        {activeTab === "Workers" && <WorkersTab />}
        {activeTab === "Attendance" && <AttendanceTab />}
        {activeTab === "Advances" && <AdvancesTab />}
        {activeTab === "Extras" && <ExtrasTab />}
        {activeTab === "Summary" && <SummaryTab />}
      </div>

      {/* Notification Permission Prompt */}
      {showNotificationPrompt && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/75 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-6 max-w-2xs mx-4 text-white">
            <div className="text-center">
              <div className="mb-4">
                <span className="text-4xl">🔔</span>
              </div>
              <h3 className="text-2xl primary-font font-bold mb-4">
                Stay Connected
              </h3>
              <p className="mb-6 text-gray-600 text-xs leading-relaxed">
                Get timely farming tips, settlement reminders, and important
                updates.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    localStorage.setItem(
                      "notifications_prompt_dismissed",
                      "true",
                    );
                    setShowNotificationPrompt(false);
                  }}
                  className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-gray-600 font-semibold px-4 py-1 rounded-xl transition-all duration-200"
                >
                  Maybe Later
                </button>
                <button
                  onClick={async () => {
                    setShowNotificationPrompt(false);
                    localStorage.setItem(
                      "notifications_prompt_dismissed",
                      "true",
                    );

                    const token = await requestNotificationPermission();
                    if (token) {
                      console.log("📲 FCM Token:", token);
                      try {
                        await axios.post("/notifications/tokens", {
                          token,
                          deviceInfo: navigator.userAgent,
                        });
                        console.log("Token saved to backend");
                      } catch (error) {
                        console.error("Failed to save token:", error);
                      }
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-orange-300 to-orange-500 hover:from-orange-400 hover:to-orange-600 text-white font-semibold px-4 py-1 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Enable Notifications
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative  bg-white/40 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-[0_25px_100px_rgba(0,0,0,0.6)] p-4 w-full max-w-2xs text-white animate-[slideUp_0.3s_ease-out]"
          >
            {/* Close */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5 text-white/70 hover:text-white" />
            </button>

            {/* Header */}
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-1">Settings</h3>
              <p className="text-white/60 text-sm">Control your preferences</p>
            </div>

            {/* Notifications Card */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 transition">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl transition ${
                    notificationsEnabled ? "shadow-lg" : "bg-white/10"
                  }`}
                  style={
                    notificationsEnabled
                      ? {
                          background:
                            "linear-gradient(135deg, #fe8216, #ff9b3f)",
                          boxShadow: "0 10px 30px rgba(254,130,22,0.5)",
                        }
                      : {}
                  }
                >
                  <Bell
                    className={`w-5 h-5 ${
                      notificationsEnabled ? "text-white" : "text-white/70"
                    }`}
                  />
                </div>

                <div>
                  <div className="font-semibold">Notifications</div>
                  <div className="text-xs text-white/60">
                    {notificationsEnabled
                      ? "You will receive important alerts"
                      : "Enable important alerts & reminders"}
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationsEnabled}
                  onChange={async (e) => {
                    const enabled = e.target.checked;

                    if (enabled) {
                      if (Notification.permission === "default") {
                        const token = await requestNotificationPermission();
                        if (!token) return;

                        setNotificationsEnabled(true);
                        localStorage.removeItem(
                          "notifications_prompt_dismissed",
                        );

                        await axios.post("/notifications/tokens", {
                          token,
                          deviceInfo: navigator.userAgent,
                        });
                      } else if (Notification.permission === "granted") {
                        const token = await requestNotificationPermission();
                        if (!token) return;

                        setNotificationsEnabled(true);

                        await axios.post("/notifications/tokens", {
                          token,
                          deviceInfo: navigator.userAgent,
                        });
                      } else {
                        alert(
                          "Notifications are blocked in browser settings. Please enable them from site settings.",
                        );
                      }
                    } else {
                      setNotificationsEnabled(false);
                      await axios.post("/notifications/tokens/disable");
                    }
                  }}
                />

                {/* Track */}
                <div
                  className="w-14 h-7 rounded-full transition-all"
                  style={{
                    background: notificationsEnabled
                      ? "linear-gradient(90deg, #fe8216, #ff9b3f)"
                      : "rgba(255,255,255,0.25)",
                  }}
                ></div>

                {/* Thumb */}
                <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-7 shadow-lg flex items-center justify-center">
                  {notificationsEnabled && (
                    <Check className="w-3 h-3 text-[#fe8216]" />
                  )}
                </div>
              </label>
            </div>

            {/* Status */}
            <div className="mt-6 text-center">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs border transition ${
                  notificationsEnabled
                    ? "text-[#fe8216] border-[#fe8216]/40 bg-[#fe8216]/15"
                    : "text-white/50 border-white/20 bg-white/10"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    notificationsEnabled
                      ? "bg-[#fe8216] animate-pulse"
                      : "bg-white/40"
                  }`}
                ></span>
                {notificationsEnabled
                  ? "Notifications Enabled"
                  : "Notifications Disabled"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
