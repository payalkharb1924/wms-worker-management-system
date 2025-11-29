import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import { Loader, X, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";

const ExtrasTab = () => {
  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(true);

  const [viewMode, setViewMode] = useState("daily"); // "daily" | "history"

  // ---- DAILY ENTRY STATE ----
  const [dailyDate, setDailyDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dailyWorkerId, setDailyWorkerId] = useState("");
  const [dailyItemName, setDailyItemName] = useState("");
  const [dailyPrice, setDailyPrice] = useState("");
  const [dailyNote, setDailyNote] = useState("");
  const [saving, setSaving] = useState(false);

  // ---- HISTORY STATE ----
  const [historyFilter, setHistoryFilter] = useState("range"); // "range" | "single" | "worker"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchLoading, setHistorySearchLoading] = useState(false);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState(""); // for "worker" filter

  // Group expand/collapse
  const [expandedDates, setExpandedDates] = useState({});

  // ---- Swipe / Delete / Undo ----
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [swipeOffsets, setSwipeOffsets] = useState({});
  const touchDataRef = useRef({});
  const deleteTimeoutsRef = useRef({});
  const pendingDeletesRef = useRef({});

  // ---- Edit modal ----
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    date: "",
    itemName: "",
    price: "",
    note: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const longPressTimeoutRef = useRef(null);

  // ---- Helpers ----

  const fetchWorkers = async () => {
    try {
      const res = await api.get("/workers");
      setWorkers(res.data.workers || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load workers");
    } finally {
      setWorkersLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const getWorkerName = (workerId) => {
    if (!workerId) return "Worker";
    const id =
      typeof workerId === "object" && workerId._id ? workerId._id : workerId;
    const w = workers.find((wk) => wk._id === id);
    return w?.name || "Worker";
  };

  const groupByDate = (entries) => {
    const groups = {};
    entries.forEach((item) => {
      if (!item.date) return;
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

  const toggleDateExpand = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // ---- DAILY: Create Extra ----
  const handleSaveExtra = async () => {
    if (!dailyWorkerId) return toast.error("Select a worker");
    if (!dailyDate) return toast.error("Select a date");
    if (!dailyItemName.trim()) return toast.error("Enter item name");
    if (!dailyPrice || Number(dailyPrice) <= 0)
      return toast.error("Enter a valid price");

    try {
      setSaving(true);
      await api.post("/extra", {
        workerId: dailyWorkerId,
        date: dailyDate,
        itemName: dailyItemName.trim(),
        price: Number(dailyPrice),
        note: dailyNote || "",
      });

      toast.success("Extra saved successfully!");

      // Reset only fields except worker + date
      setDailyItemName("");
      setDailyPrice("");
      setDailyNote("");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Failed to save extra");
    } finally {
      setSaving(false);
    }
  };

  // ---- HISTORY: Fetch by Date Range (and reused for Single Day) ----
  const fetchExtrasByDateRange = async () => {
    if (!startDate || !endDate) {
      toast.error("Select both start & end date!");
      return;
    }

    setHistorySearchLoading(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(
        `/extra?startDate=${startDate}&endDate=${endDate}`
      );
      const list = res.data.extras || [];
      setHistory(list);

      const grouped = groupByDate(list);
      const initialExpanded = {};
      Object.keys(grouped).forEach((k) => {
        initialExpanded[k] = true;
      });
      setExpandedDates(initialExpanded);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch extras");
    } finally {
      setHistoryLoading(false);
      setHistorySearchLoading(false);
    }
  };

  // ---- HISTORY: Fetch by Worker (with optional date range filter on client) ----
  const fetchExtrasByWorker = async () => {
    if (!selectedWorkerFilter) return toast.error("Select a worker");

    setHistorySearchLoading(true);
    setHistoryLoading(true);

    try {
      const res = await api.get(`/extra/worker/${selectedWorkerFilter}`);
      let list = res.data.extras || [];

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        list = list.filter((item) => {
          const d = new Date(item.date);
          return d >= start && d <= end;
        });
      }

      setHistory(list);
      const grouped = groupByDate(list);
      const initialExpanded = {};
      Object.keys(grouped).forEach((k) => {
        initialExpanded[k] = true;
      });
      setExpandedDates(initialExpanded);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch worker extras");
    } finally {
      setHistoryLoading(false);
      setHistorySearchLoading(false);
    }
  };

  // ---- DELETE + UNDO ----
  const handleDeleteExtra = (id) => {
    const deletedItem = history.find((h) => h._id === id);
    if (!deletedItem) return;

    pendingDeletesRef.current[id] = deletedItem;

    setHistory((prev) => prev.filter((i) => i._id !== id));
    setConfirmDeleteId(null);

    showUndoToast(id);

    deleteTimeoutsRef.current[id] = setTimeout(async () => {
      try {
        await api.delete(`/extra/${id}`);
      } catch (err) {
        console.log("Server delete failed (extra):", err);
      }
      delete pendingDeletesRef.current[id];
    }, 4000);
  };

  const handleUndoDelete = (id) => {
    const restoredOriginal = pendingDeletesRef.current[id];
    if (!restoredOriginal) return;

    // 1. Cancel the scheduled delete on the server
    if (deleteTimeoutsRef.current[id]) {
      clearTimeout(deleteTimeoutsRef.current[id]);
      deleteTimeoutsRef.current[id] = null;
    }

    // 2. Put the original extra back into history list (UI)
    setHistory((prev) => [...prev, restoredOriginal]);

    // 3. Make sure its date group is expanded
    const dateKey = new Date(restoredOriginal.date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
    setExpandedDates((prev) => ({ ...prev, [dateKey]: true }));

    // 4. Clear from local trash
    delete pendingDeletesRef.current[id];

    // 5. Nice toast
    toast.info("Extra restored", {
      autoClose: 3000,
    });
  };

  const showUndoToast = (id) => {
    toast(
      ({ closeToast }) => (
        <div className="flex items-center justify-between w-full">
          <span className="text-[13px] font-medium text-gray-800">
            Extra deleted
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

    startLongPress(id);
  };

  const handleTouchMove = (id, e) => {
    const touch = e.touches[0];
    const data = touchDataRef.current[id];
    if (!data) return;

    const deltaX = touch.clientX - data.startX;

    if (Math.abs(deltaX) > 5) {
      cancelLongPress();
    }

    let newOffset = data.startOffset + deltaX;

    if (newOffset > 0) newOffset = 0;
    if (newOffset < -80) newOffset = -80;

    setSwipeOffsets((prev) => ({
      ...prev,
      [id]: newOffset,
    }));
  };

  const handleTouchEnd = (id) => {
    const offset = swipeOffsets[id] || 0;
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
    }, 700);
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);

    const dateStr = record.date
      ? new Date(record.date).toISOString().split("T")[0]
      : "";

    setEditForm({
      date: dateStr,
      itemName: record.itemName,
      price: record.price,
      note: record.note || "",
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

  const handleUpdateExtra = async () => {
    if (!editingRecord) return;
    if (!editForm.itemName.trim()) return toast.error("Enter item name");
    if (!editForm.price || Number(editForm.price) <= 0) {
      return toast.error("Enter a valid price");
    }

    setUpdateLoading(true);

    try {
      const res = await api.put(`/extra/${editingRecord._id}`, {
        date: editForm.date || editingRecord.date,
        itemName: editForm.itemName.trim(),
        price: Number(editForm.price),
        note: editForm.note || "",
      });

      const updated = res.data.updatedExtra;

      setHistory((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );

      toast.success("Extra updated");
      closeEditModal();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update extra");
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
          Add Extra
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
          {/* Worker + Date */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Worker</label>
              {workersLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader className="w-4 h-4 animate-spin" />
                  Loading workers...
                </div>
              ) : (
                <select
                  value={dailyWorkerId}
                  onChange={(e) => setDailyWorkerId(e.target.value)}
                  className="border rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select worker</option>
                  {workers.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="border rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Item + Price + Note */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Item name</label>
              <input
                type="text"
                value={dailyItemName}
                onChange={(e) => setDailyItemName(e.target.value)}
                placeholder="Wheat bag, seeds, etc."
                className="border rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Price (₹)</label>
              <input
                type="number"
                min="0"
                value={dailyPrice}
                onChange={(e) => setDailyPrice(e.target.value)}
                placeholder="Enter price"
                className="border rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Note (optional)</label>
              <input
                type="text"
                value={dailyNote}
                onChange={(e) => setDailyNote(e.target.value)}
                placeholder="Any extra detail"
                className="border rounded-lg p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            className={`w-full mt-5 py-3 rounded-lg text-white font-bold ${
              saving ? "bg-orange-300" : "primary-bg"
            } flex items-center justify-center gap-2`}
            onClick={handleSaveExtra}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Extra"
            )}
          </button>
        </div>
      )}

      {/* HISTORY VIEW */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Filters Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <p className="text-sm font-semibold text-gray-800">View Extras</p>

            {/* Segmented control */}
            <div className="relative bg-white/70 backdrop-blur-md shadow-sm border border-gray-100 rounded-full p-1 flex items-center justify-between gap-1 mt-2">
              <div
                className={`absolute top-1 bottom-1 w-1/3 rounded-full transition-all duration-300 primary-bg shadow-md`}
                style={{
                  left:
                    historyFilter === "range"
                      ? "2px"
                      : historyFilter === "single"
                      ? "33%"
                      : "66%",
                }}
              />

              <button
                className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-full transition-colors duration-300 ${
                  historyFilter === "range" ? "text-white" : "text-gray-600"
                }`}
                onClick={() => setHistoryFilter("range")}
              >
                Date Range
              </button>

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
                Filter Extras
              </p>

              {/* Date Range */}
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
                    onClick={fetchExtrasByDateRange}
                    disabled={historySearchLoading}
                    className={`primary-bg text-white px-4 py-2 rounded text-sm col-span-2 
                      flex items-center justify-center gap-2 transition ${
                        historySearchLoading
                          ? "opacity-70 cursor-not-allowed"
                          : ""
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

              {/* Single Day */}
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
                    onClick={() => {
                      if (!startDate) return toast.error("Pick a date!");
                      fetchExtrasByDateRange();
                    }}
                    disabled={historySearchLoading}
                    className={`primary-bg text-white px-4 py-2 rounded-lg text-sm font-semibold 
                      flex items-center justify-center gap-2 ${
                        historySearchLoading
                          ? "opacity-70 cursor-not-allowed"
                          : ""
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

              {/* Worker filter */}
              {historyFilter === "worker" && (
                <div className="space-y-3">
                  <select
                    className="border rounded-lg p-2 text-sm w-full focus:outline-none focus:border-[var(--primary)]"
                    value={selectedWorkerFilter}
                    onChange={(e) => setSelectedWorkerFilter(e.target.value)}
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
                    onClick={fetchExtrasByWorker}
                    disabled={historySearchLoading}
                    className={`primary-bg text-white px-4 py-2 rounded-lg text-sm font-semibold 
                      w-full flex items-center justify-center gap-2 ${
                        historySearchLoading
                          ? "opacity-70 cursor-not-allowed"
                          : ""
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
              No extras found.
            </p>
          )}

          {/* Grouped by date */}
          {!historyLoading &&
            history.length > 0 &&
            Object.entries(groupByDate(history)).map(([dateKey, records]) => {
              const totalPrice = records
                .reduce((sum, r) => sum + (r.price || 0), 0)
                .toFixed(2);

              const isExpanded = expandedDates[dateKey];

              return (
                <div
                  key={dateKey}
                  className="bg-white shadow-lg rounded-2xl p-4 border border-gray-100 space-y-3"
                >
                  {/* Header / Accordion Toggle */}
                  <div
                    className="flex items-center justify-between px-1"
                    onClick={() => toggleDateExpand(dateKey)}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--primary)]" />
                      <p className="font-semibold text-gray-800 text-[15px]">
                        {dateKey}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-600 font-semibold whitespace-nowrap">
                        ₹{totalPrice}
                      </p>
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
                        const name = getWorkerName(item.workerId);
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
                            {/* Delete background */}
                            <div className="absolute inset-0 right-0 flex items-center justify-end overflow-hidden">
                              <button
                                className="w-20 h-full rounded-r-xl bg-red-500 shadow-lg text-white font-bold text-[13px] tracking-wide flex items-center justify-center active:scale-95"
                                onClick={() => setConfirmDeleteId(item._id)}
                              >
                                Delete
                              </button>
                            </div>

                            {/* Foreground card */}
                            <div
                              className="bg-gray-50 border border-gray-200 p-3 flex items-center justify-between rounded-xl shadow-sm transition-transform duration-200 ease-out no-select"
                              style={{
                                transform: `translateX(${offset}px)`,
                                transition:
                                  "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                              }}
                              onTouchStart={(e) =>
                                handleTouchStart(item._id, e)
                              }
                              onTouchMove={(e) => handleTouchMove(item._id, e)}
                              onTouchEnd={() => handleTouchEnd(item._id)}
                              onMouseDown={() => startLongPress(item._id)}
                              onMouseUp={cancelLongPress}
                              onMouseLeave={cancelLongPress}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full primary-bg text-white flex items-center justify-center font-semibold text-xs shrink-0">
                                  {initials}
                                </div>

                                <div className="flex flex-col">
                                  <p className="font-medium text-gray-700 text-sm leading-tight">
                                    {name}
                                  </p>
                                  <span className="text-[11px] text-gray-600 font-medium">
                                    {item.itemName}
                                  </span>
                                  {item.note && (
                                    <span className="text-[11px] text-gray-500">
                                      {item.note}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-gray-700 font-semibold text-sm whitespace-nowrap">
                                ₹{item.price}
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
                Edit Extra
              </h2>
              <button onClick={closeEditModal}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Date</label>
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => handleEditChange("date", e.target.value)}
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Item name</label>
              <input
                type="text"
                value={editForm.itemName}
                onChange={(e) => handleEditChange("itemName", e.target.value)}
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Price (₹)</label>
              <input
                type="number"
                min="0"
                value={editForm.price}
                onChange={(e) =>
                  handleEditChange("price", Number(e.target.value))
                }
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
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

            <button
              onClick={handleUpdateExtra}
              disabled={updateLoading}
              className={`primary-bg text-white px-4 py-2 rounded w-full flex items-center justify-center gap-2 transition ${
                updateLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {updateLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      )}

      {/* DELETE POPUP */}
      {confirmDeleteId && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-[85%] max-w-sm">
            <p className="font-semibold text-gray-800">Delete extra?</p>
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
                onClick={() => handleDeleteExtra(confirmDeleteId)}
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

export default ExtrasTab;
