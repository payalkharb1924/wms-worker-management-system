import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import { Loader, X, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";

const AttendanceTab = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily");
  const [saving, setSaving] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [historySearchLoading, setHistorySearchLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  // History state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("range");
  // "range" | "single" | "worker"

  // Accordion: which date sections are expanded
  const [expandedDates, setExpandedDates] = useState({}); // {dateKey: true/false}

  // Swipe-to-delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [swipeOffsets, setSwipeOffsets] = useState({}); // {attendanceId: offsetX}
  const touchDataRef = useRef({}); // {attendanceId: {startX}}
  const deleteTimeoutsRef = useRef({});

  // Long-press edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    rate: "",
    restMinutes: 0,
    missingMinutes: 0,
    note: "",
    remarks: "",
  });
  const longPressTimeoutRef = useRef(null);
  const scrollRef = useRef(null);
  const [showShadowTop, setShowShadowTop] = useState(false);
  const [showShadowBottom, setShowShadowBottom] = useState(true);

  const handleScrollShadow = () => {
    const el = scrollRef.current;
    if (!el) return;

    setShowShadowTop(el.scrollTop > 5);
    setShowShadowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 5);
  };

  const updateWorker = (id, field, value) => {
    setWorkers((prev) =>
      prev.map((worker) => {
        if (applyToAll && worker.present) {
          return { ...worker, [field]: value };
        }
        return worker._id === id ? { ...worker, [field]: value } : worker;
      })
    );
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate) {
      return toast.error("Please select a date");
    }

    const entries = workers
      .filter((w) => w.present)
      .map((w) => ({
        workerId: w._id,
        date: selectedDate,
        startTime: `${selectedDate}T${w.startTime}`,
        endTime: `${selectedDate}T${w.endTime}`,
        restMinutes: w.restMinutes || 0,
        missingMinutes: w.missingMinutes || 0,
        rate: w.rate,
        note: w.note || "",
        remarks: w.remarks || "",
      }));

    if (entries.length === 0) {
      return toast.error("Mark at least one worker Present");
    }

    try {
      setSaving(true);
      for (const entry of entries) {
        await api.post("/attendance/add", entry);
      }
      toast.success("Attendance saved successfully!");
      resetAttendanceFields();
    } catch (error) {
      toast.error(error.response?.data?.msg || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const resetAttendanceFields = () => {
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        present: false,
        startTime: "",
        endTime: "",
        restMinutes: 0,
        missingMinutes: 0,
        rate: "",
        note: "",
        remarks: "",
      }))
    );
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get("/workers");
      setWorkers(res.data.workers || []);
    } catch (error) {
      toast.error("Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    setHistorySearchLoading(true);
    if (!startDate || !endDate) {
      return toast.error("Select both start & end date!");
    }
    try {
      setHistoryLoading(true);
      const res = await api.get(
        `/attendance/range?startDate=${startDate}&endDate=${endDate}`
      );
      const list = res.data.attendance || [];
      setHistory(list);

      const grouped = groupByDate(list);
      const initialExpanded = {};
      Object.keys(grouped).forEach((k) => {
        initialExpanded[k] = true;
      });
      setExpandedDates(initialExpanded);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch attendance history");
    } finally {
      setHistoryLoading(false);
      setHistorySearchLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Apply first worker's data to all when Apply to All is toggled ON
  useEffect(() => {
    if (!applyToAll) return;

    setWorkers((prev) => {
      const first = prev[0];
      if (!first) return prev;

      return prev.map((w) => ({
        ...w,
        present: true,
        startTime: first.startTime,
        endTime: first.endTime,
        rate: first.rate,
        restMinutes: first.restMinutes,
        missingMinutes: first.missingMinutes,
        note: first.note,
        remarks: first.remarks,
      }));
    });
  }, [applyToAll]);

  const groupByDate = (entries) => {
    const groups = {};
    entries.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  };

  // UI helpers for settled records
  const getCardStyle = (item) =>
    item.isSettled
      ? "bg-gray-300 border border-gray-300"
      : "bg-gray-100 border border-gray-200";

  const getBadge = (item) =>
    item.isSettled ? (
      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-[2px] rounded-full">
        Settled
      </span>
    ) : (
      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-[2px] rounded-full">
        Pending
      </span>
    );

  const toggleDateExpand = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const [deleting, setDeleting] = useState(false);
  const [undoData, setUndoData] = useState(null);

  // Local Trash Bin (multiple pending deletions supported)
  const pendingDeletesRef = useRef({});

  // DELETE
  const handleDeleteAttendance = (id) => {
    const deletedItem = history.find((h) => h._id === id);
    if (!deletedItem) return;

    pendingDeletesRef.current[id] = deletedItem;

    setHistory((prev) => prev.filter((i) => i._id !== id));
    setConfirmDeleteId(null);

    showUndoToast(id);

    deleteTimeoutsRef.current[id] = setTimeout(async () => {
      await api.delete(`/attendance/${id}`);
      delete pendingDeletesRef.current[id];
    }, 4000);
  };

  // UNDO
  const handleUndoDelete = (id) => {
    const restoredOriginal = pendingDeletesRef.current[id];
    if (!restoredOriginal) return;

    // 1️⃣ Cancel scheduled delete on server
    if (deleteTimeoutsRef.current[id]) {
      clearTimeout(deleteTimeoutsRef.current[id]);
      deleteTimeoutsRef.current[id] = null;
    }

    // 2️⃣ Put the original record back into UI
    setHistory((prev) => [...prev, restoredOriginal]);

    // 3️⃣ Ensure date group is expanded
    const dateKey = new Date(restoredOriginal.date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
    setExpandedDates((prev) => ({ ...prev, [dateKey]: true }));

    // 4️⃣ Remove from local trash tracking
    delete pendingDeletesRef.current[id];

    // 5️⃣ Toast
    toast.info("Attendance restored", {
      autoClose: 3000,
    });
  };

  const showUndoToast = (id) => {
    toast(
      ({ closeToast }) => (
        <div className="flex items-center justify-between w-full">
          <span className="text-[13px] font-medium text-gray-800">
            Attendance deleted
          </span>

          <button
            onClick={() => {
              handleUndoDelete(id);
              closeToast();
            }}
            className="px-3 py-1 w-28 h-10 text-xs font-semibold rounded-lg 
                     bg-[var(--primary)] text-white active:scale-95 transition"
          >
            Undo
          </button>
        </div>
      ),
      {
        position: "bottom-center",
        autoClose: 5000,
        closeOnClick: false,
        draggable: true,
        style: {
          background: "#ffffff",
          color: "#333",
          borderRadius: "14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
          width: "100%",
          height: "100%",
          margin: "0 auto",
          padding: "20px 28px",
        },
      }
    );
  };

  // ---- Swipe handlers ----
  const handleTouchStart = (id, e) => {
    const touch = e.touches[0];
    const currentOffset = swipeOffsets[id] || 0;

    touchDataRef.current[id] = {
      startX: touch.clientX,
      startOffset: currentOffset,
    };

    // start long press timer
    startLongPress(id);
  };

  const handleTouchMove = (id, e) => {
    const touch = e.touches[0];
    const data = touchDataRef.current[id];
    if (!data) return;

    const deltaX = touch.clientX - data.startX;

    // if user is actually swiping, cancel long-press
    if (Math.abs(deltaX) > 5) {
      cancelLongPress();
    }

    let newOffset = data.startOffset + deltaX;

    // clamp between fully closed (0) and fully open (-80)
    if (newOffset > 0) newOffset = 0;
    if (newOffset < -80) newOffset = -80;

    setSwipeOffsets((prev) => ({
      ...prev,
      [id]: newOffset,
    }));
  };

  const handleTouchEnd = (id) => {
    const offset = swipeOffsets[id] || 0;

    // decide final position: open or closed
    const finalOffset = offset <= -40 ? -80 : 0;

    setSwipeOffsets((prev) => ({
      ...prev,
      [id]: finalOffset,
    }));

    delete touchDataRef.current[id];
    cancelLongPress();
  };

  // ---- Long press edit ----
  const startLongPress = (id) => {
    cancelLongPress();
    longPressTimeoutRef.current = setTimeout(() => {
      const record = history.find((h) => h._id === id);
      if (record) {
        openEditModal(record);
      }
    }, 700); // 700ms long press
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);

    const dateStr = new Date(record.date).toISOString().split("T")[0];

    const toTimeInput = (iso) => {
      const d = new Date(iso);
      return d.toISOString().substring(11, 16); // HH:MM
    };

    setEditForm({
      startTime: toTimeInput(record.startTime),
      endTime: toTimeInput(record.endTime),
      rate: record.rate,
      restMinutes: record.restMinutes || 0,
      missingMinutes: record.missingMinutes || 0,
      note: record.note || "",
      remarks: record.remarks || "",
      _dateStr: dateStr, // for later recomposition
    });

    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingRecord(null);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateAttendance = async () => {
    setUpdateLoading(true);
    if (!editingRecord) return;

    const dateStr = editForm._dateStr;
    const payload = {
      startTime: `${dateStr}T${editForm.startTime}`,
      endTime: `${dateStr}T${editForm.endTime}`,
      rate: editForm.rate,
      restMinutes: editForm.restMinutes,
      missingMinutes: editForm.missingMinutes,
      note: editForm.note,
      remarks: editForm.remarks,
    };

    try {
      const res = await api.put(`/attendance/${editingRecord._id}`, payload);
      const updated = res.data.updatedAttendance;

      setHistory((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );
      toast.success("Attendance updated");
      closeEditModal();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="pb-10">
      {/* Toggle Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          className={`flex-1 py-2 rounded-md font-medium ${
            viewMode === "daily"
              ? "primary-bg text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setViewMode("daily")}
        >
          Daily Entry
        </button>
        <button
          className={`flex-1 py-2 rounded-md font-medium ${
            viewMode === "history"
              ? "primary-bg text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setViewMode("history")}
        >
          History
        </button>
      </div>

      {/* DAILY VIEW */}
      {viewMode === "daily" && (
        <div>
          {/* Apply to All & Date */}
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            {/* Apply to all */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                Apply to all
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Date */}
            <div className="flex flex-col items-end">
              <label className="text-sm font-medium mr-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border focus:outline-none px-2 py-1 rounded text-sm mt-1"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader className="w-10 h-10 animate-spin primary-font" />
            </div>
          ) : workers.length === 0 ? (
            <p className="text-gray-500">No workers added yet.</p>
          ) : (
            <div
              className="space-y-4 overflow-y-auto no-scrollbar"
              ref={scrollRef}
              style={{
                maxHeight: "calc(100vh - 240px)", // adjust if needed
                scrollBehavior: "smooth",
                paddingBottom: "70px",
              }}
              onScroll={handleScrollShadow}
            >
              {workers.map((w) => {
                let hours = "--";
                if (w.startTime && w.endTime) {
                  const start = new Date(`2000-01-01T${w.startTime}`);
                  const end = new Date(`2000-01-01T${w.endTime}`);
                  const workedMins = (end - start) / (1000 * 60);
                  const effectiveMins =
                    workedMins - (w.restMinutes || 0) - (w.missingMinutes || 0);
                  hours =
                    effectiveMins > 0
                      ? (effectiveMins / 60).toFixed(2)
                      : "0.00";
                }

                const total =
                  hours !== "--" && w.rate ? (hours * w.rate).toFixed(2) : "--";

                const isExpanded = w.isExpanded ?? false;

                return (
                  <div
                    id={`worker-${w._id}`}
                    key={w._id}
                    className="bg-white shadow rounded-lg p-3 space-y-3 cursor-pointer transition-all"
                    onClick={() => {
                      setWorkers((prev) =>
                        prev.map((x) =>
                          x._id === w._id
                            ? { ...x, isExpanded: !isExpanded }
                            : { ...x, isExpanded: false }
                        )
                      );

                      // 👇 Auto-scroll the expanded card into view
                      setTimeout(() => {
                        document
                          .getElementById(`worker-${w._id}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                      }, 150);
                    }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800">{w.name}</p>

                      <label className="text-xs flex items-center gap-1">
                        Present
                        <label
                          className="toggle-switch"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={w.present || false}
                            onChange={(e) =>
                              updateWorker(w._id, "present", e.target.checked)
                            }
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </label>
                    </div>

                    {/* Always visible */}
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="flex flex-col space-y-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="text-[10px] text-gray-500">
                          Start
                        </label>
                        <input
                          type="time"
                          value={w.startTime || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "startTime", e.target.value)
                          }
                          className="border focus:outline-none p-2 max-w-[120px] rounded text-sm focus:border-[var(--primary)]"
                        />
                      </div>

                      <div
                        className="flex flex-col space-y-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="text-[10px] text-gray-500">End</label>
                        <input
                          type="time"
                          value={w.endTime || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "endTime", e.target.value)
                          }
                          className="border focus:outline-none p-2 max-w-[120px] rounded text-sm focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>

                    {/* EXPANDABLE ZONE */}
                    <div
                      className={`transition-all duration-300 overflow-hidden ${
                        isExpanded
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Rate */}
                      <div className="flex flex-col space-y-1 mt-2">
                        <label className="text-[10px] text-gray-500">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          placeholder="Rate"
                          min={0}
                          value={w.rate || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "rate", Number(e.target.value))
                          }
                          className="border p-2 rounded text-sm focus:border-[var(--primary)]"
                        />
                      </div>

                      {/* Rest & Missing */}
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] text-gray-500">
                            Rest Mins
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={w.restMinutes || 0}
                            onChange={(e) =>
                              updateWorker(
                                w._id,
                                "restMinutes",
                                Number(e.target.value)
                              )
                            }
                            className="border p-2 rounded text-sm focus:border-[var(--primary)]"
                          />
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] text-gray-500">
                            Missing Mins
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={w.missingMinutes || 0}
                            onChange={(e) =>
                              updateWorker(
                                w._id,
                                "missingMinutes",
                                Number(e.target.value)
                              )
                            }
                            className="border p-2 rounded text-sm focus:border-[var(--primary)]"
                          />
                        </div>
                      </div>

                      {/* Note */}
                      <div className="flex flex-col space-y-1 mt-2">
                        <label className="text-[10px] text-gray-500">
                          Note
                        </label>
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={w.note || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "note", e.target.value)
                          }
                          className="border p-2 rounded text-sm focus:border-[var(--primary)]"
                        />
                      </div>

                      {/* Remarks */}
                      <div className="flex flex-col space-y-1 mt-2">
                        <label className="text-[10px] text-gray-500">
                          Remarks
                        </label>
                        <input
                          type="text"
                          placeholder="Remarks"
                          value={w.remarks || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "remarks", e.target.value)
                          }
                          className="border p-2 rounded text-sm focus:border-[var(--primary)]"
                        />
                      </div>

                      {/* Summary */}
                      <div className="mt-2 flex justify-between text-sm text-gray-500">
                        <span>Hours: {hours}</span>
                        <span>Total: ₹ {total}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Button */}
          <button
            className={`w-full py-3 rounded-lg text-white font-bold 
  sticky bottom-8 z-10 mt-5 
  ${saving ? "bg-orange-300" : "primary-bg"}`}
            onClick={handleSaveAttendance}
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}

      {/* HISTORY TAB */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Filters Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              View Attendance
            </p>
            {/* Filter Segmented Control */}
            <div className="relative bg-white/70 backdrop-blur-md shadow-sm border border-gray-100 rounded-full p-1 flex items-center justify-between gap-1">
              {/* Sliding active background */}
              <div
                className={`absolute top-1 bottom-1 w-1/3 rounded-full transition-all duration-300
      bg-gradient-to-r  primary-bg shadow-md`}
                style={{
                  left:
                    historyFilter === "range"
                      ? "2px"
                      : historyFilter === "single"
                      ? "33%"
                      : "66%",
                }}
              />

              {/* Option: Date Range */}
              <button
                className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-full transition-colors duration-300 ${
                  historyFilter === "range" ? "text-white" : "text-gray-600"
                }`}
                onClick={() => setHistoryFilter("range")}
              >
                Date Range
              </button>

              {/* Option: Single Day */}
              <button
                className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-full transition-colors duration-300 ${
                  historyFilter === "single" ? "text-white" : "text-gray-600"
                }`}
                onClick={() => {
                  setHistoryFilter("single");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Single Day
              </button>

              {/* Option: Worker */}
              <button
                className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-full transition-colors duration-300 ${
                  historyFilter === "worker" ? "text-white" : "text-gray-600"
                }`}
                onClick={() => {
                  setHistoryFilter("worker");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Worker
              </button>
            </div>

            {/* Dynamic Filters */}
            <div className="bg-white mt-3 rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-3">
                Filter Attendance
              </p>

              {/* Date Range Filter */}
              {historyFilter === "range" && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="border rounded-lg p-2 text-sm max-w-[100px] focus:outline-none focus:border-[var(--primary)]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    className="border rounded-lg p-2 text-sm max-w-[100px] focus:outline-none focus:border-[var(--primary)]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />

                  <button
                    onClick={fetchAttendanceHistory}
                    disabled={historySearchLoading}
                    className={`primary-bg text-white px-4 py-2 rounded text-sm col-span-2 
              flex items-center justify-center gap-2 transition ${
                historySearchLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
                  >
                    {historySearchLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>
              )}

              {/* Single Day Filter */}
              {historyFilter === "single" && (
                <div className="flex flex-col gap-3">
                  <input
                    type="date"
                    className="border rounded-lg p-2 text-sm w-full focus:outline-none focus:border-[var(--primary)]"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                  />

                  <button
                    onClick={async () => {
                      if (!startDate) return toast.error("Pick a date!");

                      setHistorySearchLoading(true);

                      try {
                        const res = await api.get(
                          `/attendance/range?startDate=${startDate}&endDate=${startDate}`
                        );

                        let list = res.data.attendance || [];

                        // ⭐ FIX: Only keep exactly selected date ⭐
                        const sameDay = (d1, d2) =>
                          new Date(d1).toDateString() ===
                          new Date(d2).toDateString();
                        list = list.filter((item) =>
                          sameDay(item.date, startDate)
                        );

                        setHistory(list);

                        setExpandedDates(
                          Object.keys(groupByDate(list)).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                          }, {})
                        );
                      } catch (error) {
                        toast.error("Failed to fetch attendance");
                      } finally {
                        setHistorySearchLoading(false);
                      }
                    }}
                    disabled={historySearchLoading}
                    className={`primary-bg text-white px-4 py-2 rounded-lg text-sm font-semibold 
              flex items-center justify-center gap-2 ${
                historySearchLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
                  >
                    {historySearchLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>
              )}

              {/* Worker Filter (With Date Range Option) */}
              {historyFilter === "worker" && (
                <div className="space-y-3">
                  <select
                    className="border rounded-lg p-2 text-sm w-full focus:outline-none focus:border-[var(--primary)]"
                    onChange={(e) => setEditingRecord(e.target.value)}
                  >
                    <option value="">Select Worker</option>
                    {workers.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="border rounded-lg p-2 text-sm max-w-[100px] focus:outline-none focus:border-[var(--primary)]"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <input
                      type="date"
                      className="border rounded-lg p-2 text-sm max-w-[100px] focus:outline-none focus:border-[var(--primary)]"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!editingRecord) return toast.error("Select worker!");

                      setHistorySearchLoading(true);

                      try {
                        const res = await api.get(
                          `/attendance/worker/${editingRecord}`
                        );
                        let list = res.data.attendance || [];

                        if (startDate && endDate) {
                          list = list.filter(
                            (item) =>
                              new Date(item.date) >= new Date(startDate) &&
                              new Date(item.date) <= new Date(endDate)
                          );
                        }

                        setHistory(list);
                        setExpandedDates(
                          Object.keys(groupByDate(list)).reduce((a, b) => {
                            a[b] = true;
                            return a;
                          }, {})
                        );
                      } catch (err) {
                        toast.error("Failed to fetch worker attendance");
                      } finally {
                        setHistorySearchLoading(false);
                      }
                    }}
                    disabled={historySearchLoading}
                    className={`primary-bg text-white px-4 py-2 rounded-lg text-sm font-semibold 
              w-full flex items-center justify-center gap-2 ${
                historySearchLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
                  >
                    {historySearchLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {historyLoading && (
            <div className="text-center text-gray-500 py-8">
              Loading history...
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <p className="text-gray-500 text-center text-sm">
              No attendance found.
            </p>
          )}

          {/* Grouped by date */}
          {!historyLoading &&
            history.length > 0 &&
            Object.entries(groupByDate(history)).map(([dateKey, records]) => {
              const totalHours = records
                .reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
                .toFixed(1);
              const totalAmount = records
                .reduce((sum, r) => sum + (r.total || 0), 0)
                .toFixed(2);

              const isExpanded = expandedDates[dateKey];

              return (
                <div
                  key={dateKey}
                  className="bg-white shadow-lg rounded-2xl p-4 border border-gray-100 space-y-3"
                >
                  {/* Header / Accordion Toggle */}
                  {/* Header / Accordion Toggle */}
                  <div
                    className="flex items-center justify-between px-1"
                    onClick={() => toggleDateExpand(dateKey)}
                  >
                    {/* Left: Calendar + Date */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--primary)]" />
                      <p className="font-semibold text-gray-800 text-[15px]">
                        {dateKey}
                      </p>
                    </div>

                    {/* Right: Total + Toggle */}
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-600 font-semibold whitespace-nowrap">
                        {totalHours}h • ₹{totalAmount}
                      </p>

                      {/* Expand / Collapse Icon */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>

                  {/* Animated content */}
                  <div
                    className={`transition-all duration-300 ease-out origin-top ${
                      isExpanded
                        ? "max-h-[1000px] opacity-100"
                        : "max-h-0 opacity-0"
                    } overflow-hidden`}
                  >
                    <div className="mt-3 space-y-3">
                      {records.map((item) => {
                        const name = item.workerId?.name || "Worker";
                        const initials = name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase();

                        const offset = swipeOffsets[item._id] || 0;

                        return (
                          <div
                            key={item._id}
                            className="relative overflow-hidden rounded-xl bg-red-500"
                          >
                            {/* Delete background (only if unsettled) */}
                            {!item.isSettled && (
                              <div className="absolute inset-0 right-0 flex items-center justify-end overflow-hidden">
                                <button
                                  className="w-20 h-full rounded-r-xl bg-red-500 text-white font-bold text-[13px] tracking-wide flex items-center justify-center active:scale-95"
                                  onClick={() => setConfirmDeleteId(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}

                            {/* Foreground card - touch/swipe/long press */}
                            <div
                              className={`${getCardStyle(
                                item
                              )} p-3 flex items-start justify-between rounded-xl shadow-sm transition-transform duration-200 ease-out no-select relative`}
                              style={{
                                transform: `translateX(${offset}px)`,
                                pointerEvents: item.isSettled ? "none" : "auto",
                              }}
                              onTouchStart={(e) =>
                                !item.isSettled && handleTouchStart(item._id, e)
                              }
                              onTouchMove={(e) =>
                                !item.isSettled && handleTouchMove(item._id, e)
                              }
                              onTouchEnd={() =>
                                !item.isSettled && handleTouchEnd(item._id)
                              }
                              onMouseDown={() =>
                                !item.isSettled && startLongPress(item._id)
                              }
                              onMouseUp={cancelLongPress}
                              onMouseLeave={cancelLongPress}
                            >
                              {/* BADGE TOP RIGHT */}
                              {item.isSettled && (
                                <span className="absolute bottom-2 right-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-[1px] rounded-full">
                                  Settled
                                </span>
                              )}

                              {/* Avatar + Name */}
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full primary-bg text-white flex items-center justify-center font-semibold text-xs shrink-0">
                                  {initials}
                                </div>
                                <div className="flex flex-col">
                                  <p
                                    className={`font-medium text-sm leading-tight ${
                                      item.isSettled
                                        ? "text-gray-600"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {name}
                                  </p>
                                  <span className="text-[11px] text-gray-500">
                                    ✔ Present
                                  </span>
                                </div>
                              </div>

                              {/* Amount Right Side */}
                              <span
                                className={`font-semibold text-sm whitespace-nowrap ${
                                  item.isSettled
                                    ? "text-gray-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {item.hoursWorked}h • ₹{item.total}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-4 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-gray-800 text-base">
                Edit Attendance
              </h2>
              <button onClick={closeEditModal}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Start Time</label>
                <input
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) =>
                    handleEditChange("startTime", e.target.value)
                  }
                  className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">End Time</label>
                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => handleEditChange("endTime", e.target.value)}
                  className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={editForm.rate}
                onChange={(e) =>
                  handleEditChange("rate", Number(e.target.value))
                }
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Rest (mins)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.restMinutes}
                  onChange={(e) =>
                    handleEditChange("restMinutes", Number(e.target.value))
                  }
                  className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Missing (mins)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.missingMinutes}
                  onChange={(e) =>
                    handleEditChange("missingMinutes", Number(e.target.value))
                  }
                  className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Note</label>
              <input
                type="text"
                value={editForm.note}
                onChange={(e) => handleEditChange("note", e.target.value)}
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Remarks</label>
              <input
                type="text"
                value={editForm.remarks}
                onChange={(e) => handleEditChange("remarks", e.target.value)}
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <button
              onClick={handleUpdateAttendance}
              disabled={updateLoading}
              className={`primary-bg text-white px-4 py-2 rounded w-full flex items-center justify-center gap-2 transition ${
                updateLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {updateLoading ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Delete Popup */}
      {confirmDeleteId && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-[85%] max-w-sm">
            <p className="font-semibold text-gray-800">Delete attendance?</p>
            <p className="text-xs text-gray-500 mt-1">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 mt-5">
              <button
                className="px-4 py-2 rounded-lg text-gray-700 border"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white flex items-center justify-center min-w-[70px]"
                disabled={deleting}
                onClick={() => handleDeleteAttendance(confirmDeleteId)}
              >
                {deleting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;
