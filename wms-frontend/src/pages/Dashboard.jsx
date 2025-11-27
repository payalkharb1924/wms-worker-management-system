import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice.js";
import { useNavigate } from "react-router-dom";
import WorkersTab from "../components/WorkersTab.jsx";
import AttendanceTab from "../components/AttendanceTab.jsx";

const Dashboard = () => {
  const user = useSelector((state) => state.auth.user);

  const tabs = ["Workers", "Attendance", "Advances", "Extras", "Summary"];

  const [activeTab, setActiveTab] = useState("Workers");
  const [menuOpen, setMenuOpen] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen primary-bg p-5 relative">
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
      <div className="flex gap-2 overflow-x-auto scroll-hide pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
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
      <div className="bg-white mt-5 rounded-xl p-4 shadow-md min-h-[450px]">
        {activeTab === "Workers" && <WorkersTab />}
        {activeTab === "Attendance" && <AttendanceTab />}
        {activeTab === "Advances" && <div>Advances Content Here</div>}
        {activeTab === "Extras" && <div>Extras Content Here</div>}
        {activeTab === "Summary" && <div>Summary Content Here</div>}
      </div>
    </div>
  );
};

export default Dashboard;
