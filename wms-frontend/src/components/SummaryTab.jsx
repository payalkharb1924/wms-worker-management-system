// src/components/SummaryTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { Search, Calendar, ArrowRight, X, Loader } from "lucide-react";

const SummaryTab = () => {
  const [viewMode, setViewMode] = useState("history"); // "history" | "insights"

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ---- Fetch all settlements for this farmer ----
  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settlement/farmer/history");
      setSettlements(res.data.settlements || []);
    } catch (err) {
      console.error(err);
      // you are already using toast globally
      // but keeping it safe in-case toast isn't imported here
      // If you want, import { toast } and show error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

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

    // sort by day (latest first)
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

  // ---- UI ----
  return (
    <div className="pb-10">
      {/* Inner tabs: History / Insights */}
      <div className="flex gap-2 mb-4">
        <button
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
            viewMode === "history"
              ? "primary-bg text-white shadow-lg"
              : "bg-gray-200/80 text-gray-700"
          }`}
          onClick={() => setViewMode("history")}
        >
          Settlement History
        </button>
        <button
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
            viewMode === "insights"
              ? "primary-bg text-white shadow-lg"
              : "bg-gray-200/80 text-gray-700"
          }`}
          onClick={() => setViewMode("insights")}
        >
          Insights (soon)
        </button>
      </div>

      {/* HISTORY VIEW */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Search bar with glassmorphism */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-slate-500/40 via-slate-300/40 to-slate-500/40">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-[0_18px_45px_rgba(15,23,42,0.65)]">
              <Search className="w-4 h-4 text-slate-200/90 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search settlements by worker, date, note, amount..."
                className="w-full bg-transparent outline-none border-none text-sm text-slate-50 placeholder:text-slate-400"
              />
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
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
                  className="space-y-2 bg-slate-950/40 rounded-2xl p-3 border border-white/5 backdrop-blur-md shadow-[0_16px_40px_rgba(15,23,42,0.75)]"
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-200/90" />
                      <p className="text-xs font-semibold text-slate-100">
                        {label}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                      {list.length} settl{list.length > 1 ? "ements" : "ement"}
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
                          className="w-full text-left group"
                        >
                          <div className="flex items-center gap-3 rounded-2xl bg-white/6 backdrop-blur-xl border border-white/10 px-3 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.75)] hover:bg-white/10 hover:border-white/20 active:scale-[0.99] transition">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 via-amber-300 to-yellow-400 text-slate-900 flex items-center justify-center text-xs font-bold shadow-md shrink-0">
                              {initials}
                            </div>

                            {/* Middle - texts */}
                            <div className="flex-1 flex flex-col gap-[2px]">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-50 truncate">
                                  {workerName}
                                </p>
                                <p className="text-sm font-semibold text-emerald-300 whitespace-nowrap">
                                  ₹{s.netAmount?.toFixed(2)}
                                </p>
                              </div>

                              <p className="text-[11px] text-slate-300/90 truncate">
                                {period}
                              </p>

                              <div className="flex items-center justify-between mt-[2px]">
                                <p className="text-[10px] text-slate-400 truncate max-w-[65%]">
                                  {s.note || "No note added"}
                                </p>
                                <p className="text-[10px] text-slate-500 whitespace-nowrap">
                                  {createdTime}
                                </p>
                              </div>
                            </div>

                            {/* Arrow */}
                            <ArrowRight className="w-4 h-4 text-slate-300/80 group-hover:translate-x-0.5 transition" />
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

      {/* INSIGHTS VIEW (placeholder for later graphs) */}
      {viewMode === "insights" && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 px-6 py-5 backdrop-blur-md shadow-[0_20px_55px_rgba(15,23,42,0.85)] max-w-sm">
            <p className="text-sm font-semibold text-slate-50 mb-1">
              Insights coming soon 🚀
            </p>
            <p className="text-[12px] text-slate-300">
              We&apos;ll add graphs here for total wages, advances, extras, top
              workers, and more once the MVP is locked.
            </p>
          </div>
        </div>
      )}

      {/* MODAL – Settlement breakdown */}
      {modalOpen && selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[90%] max-w-md rounded-3xl bg-slate-950/90 border border-white/15 shadow-[0_26px_75px_rgba(0,0,0,0.9)] p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  Settlement
                </span>
                <span className="text-sm font-semibold text-slate-50">
                  {selectedSettlement.workerId?.name || "Worker"}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20"
              >
                <X className="w-3.5 h-3.5 text-slate-100" />
              </button>
            </div>

            {/* Period */}
            <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">From</span>
                <span className="text-xs text-slate-50">
                  {formatShortDate(selectedSettlement.startDate)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
              <div className="flex flex-col text-right">
                <span className="text-[11px] text-slate-400">To</span>
                <span className="text-xs text-slate-50">
                  {formatShortDate(selectedSettlement.endDate)}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Attendance total</span>
                <span className="text-slate-100 font-semibold">
                  ₹{selectedSettlement.attendanceTotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Advances</span>
                <span className="text-red-300 font-semibold">
                  -₹{selectedSettlement.advancesTotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Extras</span>
                <span className="text-red-300 font-semibold">
                  -₹{selectedSettlement.extrasTotal?.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-white/10 pt-2 mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-100 font-semibold">
                  Net settled
                </span>
                <span className="text-emerald-300 font-bold">
                  ₹{selectedSettlement.netAmount?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Note + created at */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-300">
                <span className="font-semibold text-slate-200">Note: </span>
                {selectedSettlement.note || "No note added."}
              </p>
              <p className="text-[10px] text-slate-500">
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
