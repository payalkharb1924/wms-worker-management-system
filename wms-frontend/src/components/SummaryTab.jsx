// src/components/SummaryTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import {
  Search,
  Calendar,
  ArrowRight,
  X,
  Loader,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { requestNotificationPermission } from "../firebase";

import { createSummaryTour } from "../tour/summaryTour";

const INSIGHT_OPTIONS = [
  { value: "pendingVsSettled", label: "Pending vs Settled amounts" },
  { value: "monthlyWageTrend", label: "Monthly wage expense" },
  { value: "moneyBreakdown", label: "Where your money goes" },
  { value: "topExpensiveWorkers", label: "Most expensive workers" },
  { value: "topPerformingWorkers", label: "Top performing workers" },
  { value: "pendingPerWorker", label: "Pending payments per worker" },
  { value: "attendanceTrend", label: "Daily attendance trend (30 days)" },
  {
    value: "attendanceReliability",
    label: "Worker attendance reliability (30 days)",
  },
  { value: "advanceHeavyWorkers", label: "Workers taking many advances" },
  { value: "overdueWorkers", label: "Workers overdue for settlement" },
];

const COLORS = [
  "#FB923C", // orange
  "#22C55E", // green
  "#3B82F6", // blue
  "#F97316", // darker orange
  "#A855F7", // purple
  "#EC4899", // pink
  "#0EA5E9", // cyan
];

const ensureNotificationEnabled = async () => {
  try {
    const token = await requestNotificationPermission();
    if (token) {
      await api.post("/notifications/save-token", { fcmToken: token });
      console.log("FCM Token saved!");
    }
  } catch (err) {
    console.error("Token Save Failed", err);
  }
};

const SummaryTab = () => {
  const [viewMode, setViewMode] = useState("history"); // "history" | "insights"

  // ---------- Settlement history state ----------
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ---------- Insights state ----------
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsData, setInsightsData] = useState(null);
  const [selectedInsight, setSelectedInsight] = useState("pendingVsSettled");

  // ---- Fetch all settlements for this farmer ----
  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settlement/farmer/history");
      setSettlements(res.data.settlements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Fetch all insights for this farmer ----
  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      setInsightsError("");
      const res = await api.get("/insights/overview");
      setInsightsData(res.data.data || null);
    } catch (err) {
      console.error(err);
      setInsightsError("Failed to load insights");
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem("tour.summary.completed")) return;

      const tour = createSummaryTour({ setViewMode });
      setTimeout(() => tour.start(), 300);
    };

    window.addEventListener("demo:start-summary-tour", handler);
    return () => window.removeEventListener("demo:start-summary-tour", handler);
  }, []);

  // lazily load insights when user switches to that tab first time
  useEffect(() => {
    if (viewMode === "insights") {
      ensureNotificationEnabled();

      if (!insightsData && !insightsLoading) {
        fetchInsights();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // ---- Helpers ----
  const sameDay = (d1, d2) =>
    new Date(d1).toDateString() === new Date(d2).toDateString();

  const formatShortDate = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    return dateObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDayLabel = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (sameDay(d, today)) return "Today";
    if (sameDay(d, yesterday)) return "Yesterday";

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name = "") =>
    name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  // ---- Filter & group for "crazy search" ----
  const filteredSettlements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return settlements;

    return settlements.filter((s) => {
      const workerName = s.workerId?.name || "";
      const note = s.note || "";

      const blob = [
        workerName,
        note,
        s.netAmount?.toString() || "",
        s.attendanceTotal?.toString() || "",
        s.advancesTotal?.toString() || "",
        s.extrasTotal?.toString() || "",
        formatShortDate(s.startDate),
        formatShortDate(s.endDate),
        formatShortDate(s.createdAt),
      ]
        .join(" ")
        .toLowerCase();

      return blob.includes(term);
    });
  }, [settlements, searchTerm]);

  const groupedByDay = useMemo(() => {
    const groups = {};
    filteredSettlements.forEach((s) => {
      const baseDate = s.createdAt || s.endDate || s.startDate;
      if (!baseDate) return;

      const d = new Date(baseDate);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();

      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    const sortedKeys = Object.keys(groups).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    return { groups, sortedKeys };
  }, [filteredSettlements]);

  const openModal = (settlement) => {
    setSelectedSettlement(settlement);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSettlement(null);
  };

  // ---------- INSIGHTS: data shaping ----------
  const totalPending =
    insightsData?.pendingTotals?.netPending != null
      ? insightsData.pendingTotals.netPending
      : 0;

  const pendingVsSettledData = useMemo(() => {
    if (!insightsData) return [];
    const pending = insightsData.pendingTotals?.netPending || 0;
    const settled = insightsData.totalSettledNet || 0;
    return [
      { name: "Pending", value: Number(pending.toFixed(2)) },
      { name: "Settled", value: Number(settled.toFixed(2)) },
    ];
  }, [insightsData]);

  const moneyBreakdownPieData = useMemo(() => {
    if (!insightsData) return [];
    const { attendanceTotal, advancesTotal, extrasTotal } =
      insightsData.breakdownAllTime || {};
    return [
      { name: "Attendance", value: attendanceTotal || 0 },
      { name: "Advances", value: advancesTotal || 0 },
      { name: "Extras", value: extrasTotal || 0 },
    ];
  }, [insightsData]);

  const monthlyWageData = insightsData?.monthlyWageTrend || [];
  const topByWage = insightsData?.topWorkersByWages || [];
  const topByHours = insightsData?.topWorkersByHours || [];
  const pendingPerWorkerData = insightsData?.pendingPerWorker || [];
  const weeklyAttendance = insightsData?.weeklyAttendanceTrend || [];
  const reliabilityData = insightsData?.attendanceReliability || [];
  const advanceHeavyData = insightsData?.advanceHeavyWorkers || [];
  const overdueData = insightsData?.workersOverdueSettlement || [];

  // ---------- Reusable chart tooltip ----------
  const TinyTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    return (
      <div className="rounded-lg bg-white/90 border border-gray-200 px-3 py-1.5 shadow-md text-[11px] text-gray-800">
        {label && <div className="font-semibold mb-[2px]">{label}</div>}
        <div>
          {item.name}: <span className="font-semibold">{item.value}</span>
        </div>
      </div>
    );
  };
  useEffect(() => {
    if (viewMode === "insights") {
      window.dispatchEvent(new Event("demo:summary-opened"));
    }
  }, [viewMode]);

  // ---------- UI ----------
  return (
    <div className="pb-10">
      {/* Inner tabs: History / Insights */}
      <div className="flex gap-2 mb-4">
        <button
          className={`summary-history-tab flex-1 py-2 rounded-xl text-sm font-semibold transition ${
            viewMode === "history"
              ? "primary-bg text-white shadow-lg"
              : "bg-gray-200/80 text-gray-700"
          }`}
          onClick={() => setViewMode("history")}
        >
          Settlement History
        </button>
        <button
          className={`summary-insights-tab flex-1 py-2 rounded-xl text-sm font-semibold transition ${
            viewMode === "insights"
              ? "primary-bg text-white shadow-lg"
              : "bg-gray-200/80 text-gray-700"
          }`}
          onClick={() => setViewMode("insights")}
        >
          Insights
        </button>
      </div>

      {/* ================= HISTORY VIEW ================= */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Search bar – light glassmorphism */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 shadow">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/70 shadow-md">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search settlements by worker, date, note, amount..."
                className="summary-search w-full bg-transparent outline-none border-none text-sm text-gray-800 placeholder:text-gray-400"
              />
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <Loader className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading settlements...</span>
            </div>
          )}

          {!loading && filteredSettlements.length === 0 && (
            <p className="text-center text-xs text-gray-500 mt-6">
              No settlements found{searchTerm ? " for this search." : "."}
            </p>
          )}

          {/* Groups by day */}
          {!loading &&
            filteredSettlements.length > 0 &&
            groupedByDay.sortedKeys.map((dayKey) => {
              const list = groupedByDay.groups[dayKey];
              const label = getDayLabel(dayKey);

              return (
                <div
                  key={dayKey}
                  className="space-y-2 bg-white/80 rounded-2xl p-3 border border-gray-100 backdrop-blur-md shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-700" />
                      <p className="text-xs font-semibold text-gray-800">
                        {label}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                      {list.length} settl
                      {list.length > 1 ? "ements" : "ement"}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {list.map((s) => {
                      const workerName = s.workerId?.name || "Worker";
                      const initials = getInitials(workerName);
                      const period = `${formatShortDate(
                        s.startDate
                      )}  –  ${formatShortDate(s.endDate)}`;
                      const createdTime = `${formatShortDate(
                        s.createdAt
                      )} • ${formatTime(s.createdAt)}`;

                      return (
                        <button
                          key={s._id}
                          onClick={() => openModal(s)}
                          className="settlement-card w-full text-left group"
                        >
                          <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-lg border border-gray-200 px-3 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.12)] hover:bg-white active:scale-[0.99] transition">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 via-orange-400 to-amber-400 text-gray-900 flex items-center justify-center text-xs font-bold shadow shrink-0">
                              {initials}
                            </div>

                            {/* Middle - texts */}
                            <div className="flex-1 flex flex-col gap-[2px]">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {workerName}
                                </p>
                                <p className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                                  ₹{s.netAmount?.toFixed(2)}
                                </p>
                              </div>

                              <p className="text-[11px] text-gray-500 truncate">
                                {period}
                              </p>

                              <div className="flex items-center justify-between mt-[2px]">
                                <p className="text-[10px] text-gray-500 truncate max-w-[65%]">
                                  {s.note || "No note added"}
                                </p>
                                <p className="text-[10px] text-gray-400 whitespace-nowrap">
                                  {createdTime}
                                </p>
                              </div>
                            </div>

                            {/* Arrow */}
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ================= INSIGHTS VIEW ================= */}
      {viewMode === "insights" && (
        <div className="space-y-4 mt-2">
          {/* Top row: total pending + dropdown */}
          <div className="flex flex-col gap-3">
            {/* Total pending card (small stat) */}
            <div className="rounded-2xl bg-white/80 border border-gray-200 shadow-[0_16px_40px_rgba(15,23,42,0.08)] px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-gray-500">
                  Total Pending Payment
                </span>
                <span className="text-xl font-extrabold text-emerald-600">
                  ₹{totalPending.toFixed(2)}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 text-right max-w-[120px]">
                Based on all workers&apos; unsettled attendance, advances &
                extras.
              </span>
            </div>

            {/* Insight selector – glass dropdown */}
            <div className="rounded-2xl p-[1px] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 shadow">
              <div className="relative flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/80 max-w-full">
                <div className="flex flex-col">
                  {/* <span className="text-[11px] text-gray-500 uppercase tracking-wide">
                    Insight
                  </span> */}
                  {/* <span className="text-xs font-semibold text-gray-800">
                    {
                      INSIGHT_OPTIONS.find((o) => o.value === selectedInsight)
                        ?.label
                    }
                  </span> */}
                </div>

                <div className="relative">
                  <select
                    className="appearance-none text-[11px] font-medium bg-gray-100/70 border border-gray-300 rounded-xl px-3 py-1 pr-7 text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    value={selectedInsight}
                    onChange={(e) => setSelectedInsight(e.target.value)}
                  >
                    {INSIGHT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {insightsLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <Loader className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading insights...</span>
            </div>
          )}

          {insightsError && !insightsLoading && (
            <p className="text-xs text-center text-red-500 mt-4">
              {insightsError}
            </p>
          )}

          {!insightsLoading && insightsData && (
            <div className="summary-insights rounded-3xl bg-white/85 border border-gray-200 shadow-[0_22px_60px_rgba(15,23,42,0.10)] p-3">
              {/* Responsive graph container */}
              <div className="h-[300px] insights-chart">
                {selectedInsight === "pendingVsSettled" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={pendingVsSettledData}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        label
                      >
                        {pendingVsSettledData.map((entry, index) => (
                          <Cell
                            key={`pv-${index}`}
                            fill={
                              entry.name === "Pending" ? "#FB923C" : "#22C55E"
                            }
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip content={<TinyTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "monthlyWageTrend" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyWageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={55}
                      />
                      <Tooltip content={<TinyTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="totalNet"
                        stroke="#FB923C"
                        strokeWidth={2.2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "moneyBreakdown" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moneyBreakdownPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        label
                      >
                        {moneyBreakdownPieData.map((_, index) => (
                          <Cell
                            key={`mb-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip content={<TinyTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "topExpensiveWorkers" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topByWage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={55}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip content={<TinyTooltip />} />
                      <Bar
                        dataKey="totalNet"
                        radius={[6, 6, 0, 0]}
                        fill="#FB923C"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "topPerformingWorkers" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topByHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={45}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip content={<TinyTooltip />} />
                      <Bar
                        dataKey="hours"
                        radius={[6, 6, 0, 0]}
                        fill="#FB923C"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "pendingPerWorker" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pendingPerWorkerData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={55}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip content={<TinyTooltip />} />
                      <Bar
                        dataKey="netPending"
                        radius={[6, 6, 0, 0]}
                        fill="#FB923C"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "attendanceTrend" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyAttendance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={45}
                      />
                      <Tooltip content={<TinyTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="hours"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "attendanceReliability" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reliabilityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={40}
                        domain={[0, 100]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip
                        content={<TinyTooltip />}
                        formatter={(value) => `${value.toFixed(1)} %`}
                      />
                      <Bar
                        dataKey="reliability"
                        radius={[6, 6, 0, 0]}
                        fill="#FB923C"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "advanceHeavyWorkers" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advanceHeavyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        width={40}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Tooltip content={<TinyTooltip />} />
                      <Bar
                        dataKey="totalAdvances"
                        radius={[6, 6, 0, 0]}
                        fill="#FB923C"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedInsight === "overdueWorkers" && (
                  <div className="h-full overflow-y-auto pt-2">
                    {overdueData.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center mt-6">
                        No workers are overdue for settlement 🎉
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {overdueData.map((w) => (
                          <div
                            key={w.workerId}
                            className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-2xl px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-gray-800">
                                {w.name}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Pending: ₹{w.netPending.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {w.lastSettlementDate
                                  ? `Last settled ${formatShortDate(
                                      w.lastSettlementDate
                                    )} (${w.daysSinceLast} days ago)`
                                  : "Never settled yet"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL – Settlement breakdown ================= */}
      {modalOpen && selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90%] max-w-md rounded-3xl bg-white border border-gray-200 shadow-[0_26px_75px_rgba(0,0,0,0.25)] p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-gray-500">
                  Settlement
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedSettlement.workerId?.name || "Worker"}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200"
              >
                <X className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>

            {/* Period */}
            <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500">From</span>
                <span className="text-xs text-gray-900">
                  {formatShortDate(selectedSettlement.startDate)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <div className="flex flex-col text-right">
                <span className="text-[11px] text-gray-500">To</span>
                <span className="text-xs text-gray-900">
                  {formatShortDate(selectedSettlement.endDate)}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Attendance total</span>
                <span className="text-gray-900 font-semibold">
                  ₹{selectedSettlement.attendanceTotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Advances</span>
                <span className="text-red-500 font-semibold">
                  -₹{selectedSettlement.advancesTotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Extras</span>
                <span className="text-red-500 font-semibold">
                  -₹{selectedSettlement.extrasTotal?.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-2 mt-1 flex items-center justify-between text-sm">
                <span className="text-gray-900 font-semibold">Net settled</span>
                <span className="text-emerald-600 font-bold">
                  ₹{selectedSettlement.netAmount?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Note + created at */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-700">
                <span className="font-semibold">Note: </span>
                {selectedSettlement.note || "No note added."}
              </p>
              <p className="text-[10px] text-gray-400">
                Settled on {formatShortDate(selectedSettlement.createdAt)} at{" "}
                {formatTime(selectedSettlement.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryTab;
