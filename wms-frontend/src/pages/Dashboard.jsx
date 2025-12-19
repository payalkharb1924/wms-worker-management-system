import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";
import { loadUser } from "../features/auth/authActions";
import { useNavigate } from "react-router-dom";
import WorkersTab from "../components/WorkersTab.jsx";
import AttendanceTab from "../components/AttendanceTab.jsx";
import AdvancesTab from "../components/AdvancesTab.jsx";
import ExtrasTab from "../components/ExtrasTab.jsx";
import SummaryTab from "../components/SummaryTab.jsx";
import DemoTour from "../components/DemoTour.jsx";
import { demoSteps } from "../demo/demoSteps.js";

const Dashboard = () => {
  const { user, token } = useSelector((state) => state.auth);

  const tabs = ["Workers", "Attendance", "Advances", "Extras", "Summary"];

  const [activeTab, setActiveTab] = useState("Workers");
  const [menuOpen, setMenuOpen] = useState(false);

  const [runDemo, setRunDemo] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && token) {
      dispatch(loadUser());
    }
  }, [user, token, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  useEffect(() => {
    const seen = localStorage.getItem("hasSeenDemo");

    if (!seen && token) {
      setTimeout(() => {
        setRunDemo(true);
      }, 1200); // ⬅️ IMPORTANT
    }
  }, [token]);

  return (
    <div className="min-h-screen primary-bg flex flex-col overflow-x-hidden">
      {/* 🔥 Guided Demo (runs only first time) */}
      <div className="px-4 pt-5 flex flex-col flex-1">
        <DemoTour
          run={runDemo}
          steps={demoSteps}
          onStepChange={(index) => {
            const step = demoSteps[index];
            if (step?.tab) {
              setActiveTab(step.tab);
            }
          }}
          onFinish={() => {
            localStorage.setItem("hasSeenDemo", "true");
            setRunDemo(false);
          }}
        />

        {/* Header */}
        <div className="flex justify-between items-center text-white mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              Hi! {user?.name || "Farmer"} 👋
            </h2>
            <p className="opacity-70">Welcome to Dashboard</p>
          </div>
          {/* Hamburger Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 flex items-center justify-center bg-black/10 rounded-lg"
            >
              <span className="text-2xl">☰</span>
            </button>
            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white text-black shadow-lg rounded-lg p-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-2 rounded hover:bg-gray-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              data-tour={`nav-${tab.toLowerCase()}`}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap
        ${tab === "Workers" ? "nav-workers" : ""}
        ${tab === "Attendance" ? "nav-attendance" : ""}
        ${tab === "Advances" ? "nav-advances" : ""}
        ${tab === "Extras" ? "nav-extras" : ""}
        ${tab === "Summary" ? "nav-summary" : ""}
        ${
          activeTab === tab
            ? "bg-white text-gray-900 shadow-md"
            : "bg-black/10 text-white"
        }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div
          className="bg-white mt-5 rounded-xl p-4 shadow-md 
  flex-1 overflow-y-auto max-h-[calc(100vh-190px)] relative scroll-smooth no-scrollbar min-h-[450px]"
        >
          {activeTab === "Workers" && <WorkersTab />}
          {activeTab === "Attendance" && <AttendanceTab />}
          {activeTab === "Advances" && <AdvancesTab />}
          {activeTab === "Extras" && <ExtrasTab />}
          {activeTab === "Summary" && <SummaryTab />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
