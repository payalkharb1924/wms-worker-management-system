import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import { Loader, X, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import { createAttendanceHistoryGesturesTour } from "../tour/attendanceHistoryGesturesTour";

const AttendanceTab = () => {
  const [workers, setWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily");
  const [saving, setSaving] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [historySearchLoading, setHistorySearchLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
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
    status: "present",
    startTime: "",
    endTime: "",
    hoursWorked: "",
    rate: "",
    restMinutes: 0,
    missingMinutes: 0,
    note: "",
    remarks: "",
    segments: [],
    isSplit: false,
  });
  useEffect(() => {
    if (!editModalOpen) return;

    // push state when modal opens
    window.history.pushState({ editModal: true }, "");

    const handlePopState = () => {
      setEditModalOpen(false);
      setEditingRecord(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [editModalOpen]);

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
    setWorkers((prev) => {
      if (!applyToAll) {
        return prev.map((w) => (w._id === id ? { ...w, [field]: value } : w));
      }

      // APPLY TO ALL
      return prev.map((w) => ({
        ...w,
        [field]: value,
      }));
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate) {
      return toast.error("Please select a date");
    }

    const unmarkedWorkers = workers.filter(
      (w) => w.status !== "inactive" && !w.attendanceStatus,
    );

    if (unmarkedWorkers.length > 0) {
      return toast.error(
        `Please mark attendance for all workers (present or absent)`,
      );
    }

    const entries = workers
      .filter((w) => w.attendanceStatus) // present | absent | inactive
      .map((w) => {
        // MULTI SEGMENT PRESENT
        if (w.attendanceStatus === "present" && w.multiMode) {
          return {
            workerId: w._id,
            date: selectedDate,
            status: "present",
            segments: w.segments.map((s) => ({
              rate: s.rate,
              hoursWorked: s.hoursWorked || undefined,
              startTime: s.startTime
                ? `${selectedDate}T${s.startTime}`
                : undefined,
              endTime: s.endTime ? `${selectedDate}T${s.endTime}` : undefined,
            })),
            note: w.note || "",
            remarks: w.remarks || "",
          };
        }

        // ===============================
        // 🔴 ABSENT
        // ===============================
        if (w.attendanceStatus === "absent") {
          return {
            workerId: w._id,
            date: selectedDate,
            status: "absent",
            note: w.note, // REQUIRED (validated before save)
            remarks: w.remarks || "",
          };
        }

        // ===============================
        // ⚫ INACTIVE
        // ===============================
        if (w.attendanceStatus === "inactive") {
          return {
            workerId: w._id,
            date: selectedDate,
            status: "inactive",
            note: "Inactive",
            remarks: "",
          };
        }

        // ===============================
        // 🟢 PRESENT (KEEP EXISTING LOGIC)
        // ===============================

        // 👉 If Hours Worked provided, auto-generate start/end
        if (w.hoursWorked && w.hoursWorked > 0) {
          const hours = Number(w.hoursWorked);

          // Base start: 09:00
          const startDate = new Date(2000, 0, 1, 9, 0);
          const endDate = new Date(
            startDate.getTime() + hours * 60 * 60 * 1000,
          );

          const pad = (n) => n.toString().padStart(2, "0");

          const startStr = `${pad(startDate.getHours())}:${pad(
            startDate.getMinutes(),
          )}`;
          const endStr = `${pad(endDate.getHours())}:${pad(
            endDate.getMinutes(),
          )}`;

          return {
            workerId: w._id,
            date: selectedDate,
            status: "present",
            startTime: `${selectedDate}T${startStr}`,
            endTime: `${selectedDate}T${endStr}`,
            hoursWorked: hours, // optional (backend ignores if recalculated)
            restMinutes: w.restMinutes || 0,
            missingMinutes: w.missingMinutes || 0,
            rate: w.rate,
            note: w.note || "",
            remarks: w.remarks || "",
          };
        }

        // 👉 Otherwise, use actual start + end (fallback to 09:00)
        return {
          workerId: w._id,
          date: selectedDate,
          status: "present",
          startTime: w.startTime
            ? `${selectedDate}T${w.startTime}`
            : `${selectedDate}T09:00`,
          endTime: w.endTime
            ? `${selectedDate}T${w.endTime}`
            : `${selectedDate}T09:00`,
          restMinutes: w.restMinutes || 0,
          missingMinutes: w.missingMinutes || 0,
          rate: w.rate,
          note: w.note || "",
          remarks: w.remarks || "",
        };
      });

    if (entries.length === 0) {
      return toast.error("Mark at least one worker Present");
    }

    const invalidAbsent = workers.some(
      (w) => w.attendanceStatus === "absent" && (!w.note || !w.note.trim()),
    );

    if (invalidAbsent) {
      return toast.error("Please add reason for absent workers");
    }

    try {
      setSaving(true);
      const invalidSegments = workers.some(
        (w) =>
          w.multiMode &&
          w.segments.some(
            (s) => !s.rate || (!s.hoursWorked && !(s.startTime && s.endTime)),
          ),
      );

      if (invalidSegments) {
        return toast.error("Fill hours/time and rate for all parts");
      }

      for (const entry of entries) {
        await api.post("/attendance/add", entry);
      }
      toast.success("Attendance saved successfully!");
      window.dispatchEvent(new Event("demo:attendance-saved"));
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
        attendanceStatus: null, // "present" | "absent"
        startTime: "",
        endTime: "",
        restMinutes: 0,
        missingMinutes: 0,
        rate: "",
        note: "",
        remarks: "",
      })),
    );
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get("/workers");

      setWorkers(
        (res.data.workers || []).map((w) => ({
          ...w,
          attendanceStatus: "absent",
          multiMode: false, // 👈 new
          segments: [
            {
              hoursWorked: "",
              rate: "",
            },
          ],
        })),
      );
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
        `/attendance/range?startDate=${startDate}&endDate=${endDate}`,
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
        attendanceStatus: first.attendanceStatus,
        startTime: first.startTime,
        endTime: first.endTime,
        hoursWorked: first.hoursWorked,
        rate: first.rate,
        restMinutes: first.restMinutes,
        missingMinutes: first.missingMinutes,
        note: first.note,
        remarks: first.remarks,
      }));
    });
  }, [applyToAll]);

  const startHistoryGesturesTourIfNeeded = () => {
    const completed = localStorage.getItem(
      "tour.attendance.history.gestures.completed",
    );

    if (completed) return;

    // Wait until at least ONE card exists
    const waitForCard = setInterval(() => {
      const card = document.querySelector(".history-attendance-card");
      if (card) {
        clearInterval(waitForCard);
        createAttendanceHistoryGesturesTour().start();
      }
    }, 120);
  };

  useEffect(() => {
    if (viewMode === "history" && history.length > 0) {
      setTimeout(() => {
        startHistoryGesturesTourIfNeeded();
      }, 400); // allow DOM paint
    }
  }, [viewMode, history]);

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
      ? "bg-gray-200 border border-gray-300"
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
      },
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
      },
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

    const finalOffset = offset <= -40 ? -80 : 0;

    setSwipeOffsets((prev) => ({
      ...prev,
      [id]: finalOffset,
    }));

    // 🔥 DEMO EVENT: user successfully swiped
    if (finalOffset === -80) {
      window.addEventListener(
        "demo:attendance-swiped",
        () => {
          attendanceTour.next();
        },
        { once: true },
      );
    }

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
    const isSplit = record.segments && record.segments.length > 0;

    setEditingRecord(record);

    const dateStr = new Date(record.date).toISOString().split("T")[0];

    const toTimeInput = (iso) => {
      const d = new Date(iso);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      return `${hh}:${mm}`;
    };

    setEditForm({
      status: record.status,
      startTime: record.startTime ? toTimeInput(record.startTime) : "",
      endTime: record.endTime ? toTimeInput(record.endTime) : "",
      hoursWorked: record.hoursWorked || "",
      rate: record.rate || "",
      restMinutes: record.restMinutes || 0,
      missingMinutes: record.missingMinutes || 0,
      note: record.note || "",
      remarks: record.remarks || "",
      segments: record.segments.map((s) => ({
        mode: s.mode || (s.startTime && s.endTime ? "time" : "hours"),
        startTime: s.startTime ? toTimeInput(s.startTime) : "",
        endTime: s.endTime ? toTimeInput(s.endTime) : "",
        hoursWorked: s.mode === "hours" ? s.hoursWorked : "",
        rate: s.rate ?? "",
      })),

      isSplit,
      _dateStr: dateStr,
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
      status: editForm.status,
      note: editForm.note,
      remarks: editForm.remarks,
    };

    if (editForm.isSplit) {
      payload.segments = editForm.segments.map((s) => ({
        mode: s.mode,
        startTime: s.mode === "time" ? `${dateStr}T${s.startTime}` : null,
        endTime: s.mode === "time" ? `${dateStr}T${s.endTime}` : null,
        hoursWorked: s.mode === "hours" ? s.hoursWorked : undefined,
        rate: s.rate,
      }));
    }

    if (editForm.status === "present" && !editForm.isSplit) {
      payload.rate = editForm.rate;
      payload.restMinutes = editForm.restMinutes;
      payload.missingMinutes = editForm.missingMinutes;

      // 👉 If Hours Worked is provided
      if (editForm.hoursWorked && editForm.hoursWorked > 0) {
        const hours = Number(editForm.hoursWorked);

        const startDate = new Date(2000, 0, 1, 9, 0);
        const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);

        const pad = (n) => n.toString().padStart(2, "0");

        const startStr = `${pad(startDate.getHours())}:${pad(
          startDate.getMinutes(),
        )}`;
        const endStr = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

        payload.startTime = `${dateStr}T${startStr}`;
        payload.endTime = `${dateStr}T${endStr}`;
        payload.hoursWorked = hours;
      } else {
        // 👉 Otherwise use manual start/end
        payload.startTime = `${dateStr}T${editForm.startTime}`;
        payload.endTime = `${dateStr}T${editForm.endTime}`;
        payload.hoursWorked = undefined;
      }
    }

    if (
      editForm.status === "absent" &&
      (!editForm.note || !editForm.note.trim())
    ) {
      setUpdateLoading(false);
      return toast.error("Reason is required for absent worker");
    }

    try {
      const res = await api.put(`/attendance/${editingRecord._id}`, payload);
      const updated = res.data.updatedAttendance;

      setHistory((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      );
      toast.success("Attendance updated");
      window.dispatchEvent(new Event("demo:attendance-edited"));
      closeEditModal();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance");
    } finally {
      setUpdateLoading(false);
    }
  };

  // 👇 Only ACTIVE workers for Daily Attendance
  const activeWorkers = workers.filter(
    (w) => w.status === "active" || !w.status,
  );

  const searchedWorkers = activeWorkers.filter((w) =>
    w.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="pb-0 attendance-root">
      {/* Toggle Tabs */}
      <div className="attendance-toggle flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        <button
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            viewMode === "daily"
              ? "primary-bg text-white shadow-sm"
              : "text-gray-600"
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
          onClick={() => {
            setViewMode("history");
            window.dispatchEvent(new Event("demo:attendance-history-opened"));
          }}
        >
          History
        </button>
      </div>

      {/* DAILY VIEW */}
      {viewMode === "daily" && (
        <div className="flex flex-col h-[calc(100vh-180px)]">
          {/* Apply to All & Date */}
          <div className="grid grid-cols-2 gap-4 items-center mb-3">
            {/* Apply to all */}
            <div className="attendance-apply-all flex pt-3 items-center gap-0">
              <label className="text-sm font-medium whitespace-nowrap">
                Apply to all
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => {
                    setApplyToAll(e.target.checked);
                    window.dispatchEvent(
                      new Event("demo:attendance-apply-all"),
                    );
                  }}
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
                className="attendance-date border border-gray-200 rounded-xl px-3 py-2 text-sm 
           max-w-[180px]
           bg-white/80 backdrop-blur-sm
           focus:outline-none 
           focus:ring-2 focus:ring-[var(--primary)]/20 
           focus:border-[var(--primary)] 
           transition"
              />
            </div>
          </div>
          {/* Search Worker */}
          <div className="mb-3 w-full">
            <input
              type="text"
              placeholder="Search worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="attendance-search w-full px-4 py-1 rounded-xl border border-gray-200 
               text-sm bg-white/80 backdrop-blur-sm
               focus:outline-none focus:ring-2 
               focus:ring-[var(--primary)]/20 
               focus:border-[var(--primary)]
               transition"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader className="w-10 h-10 animate-spin primary-font" />
            </div>
          ) : searchedWorkers.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10">
              {searchQuery
                ? "No matching worker found."
                : "No active workers available for attendance."}
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScrollShadow}
              className="flex-1 overflow-y-auto no-scrollbar space-y-4 px-1"
            >
              {searchedWorkers.map((w, index) => {
                let hours = "--";

                if (w.hoursWorked && w.hoursWorked > 0) {
                  // Direct input
                  hours = Number(w.hoursWorked).toFixed(2);
                } else if (w.startTime && w.endTime) {
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
                    className={`attendance-card bg-white/80 backdrop-blur-md rounded-2xl p-4 space-y-4 cursor-pointer
           transition-all duration-200
           border border-gray-200/60
           hover:shadow-md active:scale-[0.99] ${
             index === 0 ? "attendance-card-first" : ""
           }`}
                    onClick={() => {
                      setWorkers((prev) =>
                        prev.map((x) =>
                          x._id === w._id
                            ? { ...x, isExpanded: !isExpanded }
                            : { ...x, isExpanded: false },
                        ),
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
                      window.dispatchEvent(
                        new Event("demo:attendance-expanded"),
                      );
                    }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800">{w.name}</p>

                      <label className="text-xs flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            w.attendanceStatus === "present"
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {w.attendanceStatus === "present"
                            ? "Present"
                            : "Absent"}
                        </span>

                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={w.attendanceStatus === "present"}
                            onChange={(e) => {
                              const status = e.target.checked
                                ? "present"
                                : "absent";
                              setWorkers((prev) =>
                                prev.map((x) =>
                                  x._id === w._id
                                    ? {
                                        ...x,
                                        attendanceStatus: status,
                                        // clear irrelevant fields
                                        ...(status === "present"
                                          ? { note: "" }
                                          : {
                                              startTime: "",
                                              endTime: "",
                                              hoursWorked: "",
                                              restMinutes: 0,
                                              missingMinutes: 0,
                                            }),
                                      }
                                    : x,
                                ),
                              );
                            }}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </label>
                    </div>

                    {w.attendanceStatus === "present" && (
                      <div
                        className="mt-2 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* MODE SWITCH */}
                        <div className="flex items-center gap-6 text-xs font-semibold">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={!w.multiMode}
                              onChange={() =>
                                updateWorker(w._id, "multiMode", false)
                              }
                            />
                            Single Rate
                          </label>

                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={w.multiMode}
                              onChange={() =>
                                updateWorker(w._id, "multiMode", true)
                              }
                            />
                            Half-time Split
                          </label>
                        </div>

                        {/* SINGLE RATE MODE */}
                        {!w.multiMode && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="field-label">Start</label>
                                <input
                                  type="time"
                                  value={w.startTime || ""}
                                  onChange={(e) =>
                                    updateWorker(
                                      w._id,
                                      "startTime",
                                      e.target.value,
                                    )
                                  }
                                  className="field-input"
                                />
                              </div>

                              <div>
                                <label className="field-label">End</label>
                                <input
                                  type="time"
                                  value={w.endTime || ""}
                                  onChange={(e) =>
                                    updateWorker(
                                      w._id,
                                      "endTime",
                                      e.target.value,
                                    )
                                  }
                                  className="field-input"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="field-label">Rate (₹)</label>
                                <input
                                  type="number"
                                  value={w.rate || ""}
                                  onChange={(e) =>
                                    updateWorker(
                                      w._id,
                                      "rate",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="field-input"
                                />
                              </div>

                              <div>
                                <label className="field-label">
                                  Hours Worked
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={w.hoursWorked || ""}
                                  onChange={(e) =>
                                    updateWorker(
                                      w._id,
                                      "hoursWorked",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="field-input"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {/* HALF TIME MODE */}
                        {w.multiMode && (
                          <div className="space-y-3">
                            {w.segments.map((seg, i) => (
                              <div
                                key={i}
                                className="border border-gray-300 rounded-xl p-3 bg-gray-50 relative"
                              >
                                {/* ❌ Remove segment */}
                                {w.segments.length > 1 && (
                                  <button
                                    type="button"
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                    onClick={() => {
                                      const updated = w.segments.filter(
                                        (_, idx) => idx !== i,
                                      );
                                      updateWorker(w._id, "segments", updated);
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                )}

                                <p className="text-xs font-semibold mb-2">
                                  Part {i + 1}
                                </p>

                                {/* Start + End */}
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="time"
                                    value={seg.startTime || ""}
                                    onChange={(e) => {
                                      const updated = [...w.segments];
                                      updated[i].startTime = e.target.value;
                                      updated[i].hoursWorked = "";
                                      updateWorker(w._id, "segments", updated);
                                    }}
                                    className="field-input"
                                  />
                                  <input
                                    type="time"
                                    value={seg.endTime || ""}
                                    onChange={(e) => {
                                      const updated = [...w.segments];
                                      updated[i].endTime = e.target.value;
                                      updated[i].hoursWorked = "";
                                      updateWorker(w._id, "segments", updated);
                                    }}
                                    className="field-input"
                                  />
                                </div>

                                {/* OR */}
                                <p className="text-center text-[10px] text-gray-400 my-1">
                                  OR
                                </p>

                                {/* Hours */}
                                <input
                                  type="number"
                                  step="0.5"
                                  placeholder="Hours"
                                  value={seg.hoursWorked}
                                  onChange={(e) => {
                                    const updated = [...w.segments];
                                    updated[i].hoursWorked = Number(
                                      e.target.value,
                                    );
                                    updated[i].startTime = "";
                                    updated[i].endTime = "";
                                    updateWorker(w._id, "segments", updated);
                                  }}
                                  className="field-input"
                                />

                                {/* Rate */}
                                <input
                                  type="number"
                                  placeholder="Rate"
                                  value={seg.rate}
                                  onChange={(e) => {
                                    const updated = [...w.segments];
                                    updated[i].rate = Number(e.target.value);
                                    updateWorker(w._id, "segments", updated);
                                  }}
                                  className="field-input mt-2"
                                />
                              </div>
                            ))}

                            <button
                              className="text-xs text-blue-600"
                              onClick={() =>
                                updateWorker(w._id, "segments", [
                                  ...w.segments,
                                  {},
                                ])
                              }
                            >
                              + Add Segment
                            </button>
                          </div>
                        )}

                        {/* REST + MISSING */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="field-label">Rest (mins)</label>
                            <input
                              type="number"
                              value={w.restMinutes || 0}
                              onChange={(e) =>
                                updateWorker(
                                  w._id,
                                  "restMinutes",
                                  Number(e.target.value),
                                )
                              }
                              className="field-input"
                            />
                          </div>

                          <div>
                            <label className="field-label">
                              Missing (mins)
                            </label>
                            <input
                              type="number"
                              value={w.missingMinutes || 0}
                              onChange={(e) =>
                                updateWorker(
                                  w._id,
                                  "missingMinutes",
                                  Number(e.target.value),
                                )
                              }
                              className="field-input"
                            />
                          </div>
                        </div>

                        {/* NOTE */}
                        <div>
                          <label className="field-label">Note</label>
                          <input
                            type="text"
                            value={w.note || ""}
                            onChange={(e) =>
                              updateWorker(w._id, "note", e.target.value)
                            }
                            className="field-input"
                          />
                        </div>

                        {/* SUMMARY */}
                        <div className="flex justify-between text-sm font-medium text-gray-600">
                          <span>Hours: {hours}</span>
                          <span>Total: ₹ {total}</span>
                        </div>
                      </div>
                    )}

                    {w.attendanceStatus === "absent" && (
                      <div className="mt-3">
                        <label className="text-xs text-gray-500">
                          Reason for absence *
                        </label>
                        <input
                          type="text"
                          value={w.note || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "note", e.target.value)
                          }
                          className="border border-gray-200 focus:ring-[var(--primary)] rounded-xl px-3 py-2 text-sm w-full"
                          placeholder="Reason is required"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* footer */}
          <div
            className="sticky bottom-0 z-30
  bg-white
  border-t rounded-2xl border-gray-200
  px-4 pt-1 pb-6
  "
          >
            <div className="shrink-0 bg-white  px-4 py-4">
              <button
                className={`attendance-save-btn w-full py-3.5 rounded-2xl text-white text-base font-semibold 
      shadow-lg shadow-orange-200/40
      active:scale-[0.97] transition-all
      ${saving ? "bg-orange-300" : "primary-bg"}`}
                onClick={handleSaveAttendance}
              >
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Filters Card */}
          <div className=" bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              View Attendance
            </p>
            {/* Filter Segmented Control */}
            <div className="relative bg-white/70 backdrop-blur-md shadow-sm border border-gray-100 rounded-full p-1 flex items-center justify-between gap-1">
              {/* Sliding active background */}
              <div
                className={`absolute top-1 bottom-1 w-1/3 rounded-full transition-[max-height,opacity] duration-300 ease-in-out

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
            <div className="history-filters-card bg-white mt-3 rounded-xl p-4 shadow-md border border-gray-100">
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
                    className={`history-filters-info primary-bg text-white px-4 py-2 rounded text-sm col-span-2 
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
                          `/attendance/range?startDate=${startDate}&endDate=${startDate}`,
                        );

                        let list = res.data.attendance || [];

                        // ⭐ FIX: Only keep exactly selected date ⭐
                        const sameDay = (d1, d2) =>
                          new Date(d1).toDateString() ===
                          new Date(d2).toDateString();
                        list = list.filter((item) =>
                          sameDay(item.date, startDate),
                        );

                        setHistory(list);

                        setExpandedDates(
                          Object.keys(groupByDate(list)).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                          }, {}),
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
                          `/attendance/worker/${editingRecord}`,
                        );
                        let list = res.data.attendance || [];

                        if (startDate && endDate) {
                          list = list.filter(
                            (item) =>
                              new Date(item.date) >= new Date(startDate) &&
                              new Date(item.date) <= new Date(endDate),
                          );
                        }

                        setHistory(list);
                        setExpandedDates(
                          Object.keys(groupByDate(list)).reduce((a, b) => {
                            a[b] = true;
                            return a;
                          }, {}),
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
              const presentRecords = records.filter(
                (r) => r.status === "present",
              );

              const totalHours = presentRecords
                .reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
                .toFixed(1);

              const totalAmount = presentRecords
                .reduce((sum, r) => sum + (r.total || 0), 0)
                .toFixed(2);

              const isExpanded = expandedDates[dateKey];

              return (
                <div
                  key={dateKey}
                  className="bg-white rounded-3xl p-5 border border-gray-100 
           shadow-sm hover:shadow-md transition"
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
                    className={`transition-[max-height,opacity] duration-300 ease-in-out
 ease-out origin-top ${
   isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
 } overflow-hidden`}
                  >
                    <div className="mt-3 space-y-3">
                      {records.map((item) => {
                        const isMulti =
                          item.segments && item.segments.length > 0;

                        const name = item.workerId?.name || "Worker";
                        const initials = name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase();

                        const offset = swipeOffsets[item._id] || 0;
                        const isLocked =
                          item.isSettled || item.status === "inactive";

                        return (
                          <div
                            key={item._id}
                            className="relative overflow-hidden rounded-xl"
                          >
                            {/* Delete background (only if unsettled) */}
                            {!isLocked && (
                              <div className="absolute inset-0 right-0 flex items-center justify-end overflow-hidden">
                                <button
                                  className="delete-attendance-btn w-20 h-full rounded-r-xl bg-red-500 text-white font-bold text-[13px] tracking-wide flex items-center justify-center active:scale-95"
                                  onClick={() => setConfirmDeleteId(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}

                            {/* Foreground card - touch/swipe/long press */}
                            <div
                              className={`${getCardStyle(
                                item,
                              )} p-4 flex items-start justify-between rounded-2xl 
  shadow-sm hover:shadow-md 
  transition-all duration-200 
  no-select relative history-attendance-card`}
                              style={{
                                transform: `translateX(${offset}px)`,
                                pointerEvents: isLocked ? "none" : "auto",
                              }}
                              onTouchStart={(e) =>
                                !isLocked && handleTouchStart(item._id, e)
                              }
                              onTouchMove={(e) =>
                                !isLocked && handleTouchMove(item._id, e)
                              }
                              onTouchEnd={() =>
                                !isLocked && handleTouchEnd(item._id)
                              }
                              onMouseDown={() =>
                                !isLocked && startLongPress(item._id)
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
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`font-semibold text-sm ${
                                        item.isSettled
                                          ? "text-gray-600"
                                          : "text-gray-800"
                                      }`}
                                    >
                                      {name}
                                    </p>

                                    <span
                                      className={`text-[10px] px-2 py-[2px] rounded-full font-semibold
      ${
        item.status === "present"
          ? "bg-green-100 text-green-700"
          : item.status === "absent"
            ? "bg-red-100 text-red-600"
            : "bg-gray-200 text-gray-600"
      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </div>

                                  {item.status === "present" && isMulti && (
                                    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                                      <div className="grid grid-cols-4 gap-10 text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-1">
                                        <span>Hours</span>
                                        <span>Rate</span>
                                        <span>Total</span>
                                      </div>

                                      {item.segments.map((s, i) => (
                                        <div
                                          key={i}
                                          className="grid grid-cols-4 gap-10 text-[11px] px-2 py-1 border-t"
                                        >
                                          <span>{s.hoursWorked}h</span>
                                          <span>₹{s.rate}</span>
                                          <span className="font-medium">
                                            ₹{s.total}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {item.status === "absent" && item.note && (
                                    <p className="mt-1 text-[11px] text-gray-800 italic max-w-[220px]">
                                      Reason: {item.note}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Amount Right Side */}
                              <span className="text-right">
                                {item.status === "present" ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-gray-900">
                                      ₹{item.total}
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                      {item.hoursWorked} hrs
                                    </span>
                                  </div>
                                ) : (
                                  "—"
                                )}
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
          <div
            className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md 
     max-h-[85vh] flex flex-col animate-scaleIn"
          >
            <div className="flex justify-between items-center px-5 py-4">
              <h2 className="font-semibold text-gray-800 text-base">
                Edit Attendance
              </h2>
              <button onClick={closeEditModal}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Status Switch */}
              <div className="flex items-center justify-between bg-gray-100 rounded-xl p-2">
                <span className="text-sm font-medium text-gray-700">
                  Attendance Status
                </span>

                <select
                  value={editForm.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;

                    if (newStatus === "present") {
                      setEditForm((prev) => ({
                        ...prev,
                        status: "present",
                        startTime: prev.startTime || "09:00",
                        endTime: prev.endTime || "17:00",
                        rate: prev.rate || "",
                        hoursWorked: prev.hoursWorked || "",
                        restMinutes: prev.restMinutes || 0,
                        missingMinutes: prev.missingMinutes || 0,
                        isSplit: prev.segments && prev.segments.length > 0,
                      }));
                    } else {
                      setEditForm((prev) => ({
                        ...prev,
                        status: "absent",
                      }));
                    }
                  }}
                  disabled={editingRecord?.status === "inactive"}
                  className="border rounded-lg px-3 py-1 text-sm focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              {editForm.status === "present" && (
                <>
                  {/* SPLIT MODE */}
                  {editForm.isSplit ? (
                    <div className="space-y-3">
                      {editForm.segments.map((seg, i) => (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-xl p-3 bg-gray-50 relative"
                        >
                          {/* DELETE SEGMENT */}
                          {editForm.segments.length > 1 && (
                            <button
                              type="button"
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                              onClick={() => {
                                setEditForm((prev) => {
                                  const updated = prev.segments.filter(
                                    (_, idx) => idx !== i,
                                  );

                                  return {
                                    ...prev,
                                    segments: updated,
                                    isSplit: updated.length > 0,
                                  };
                                });
                              }}
                            >
                              <X size={14} />
                            </button>
                          )}

                          <p className="text-xs font-semibold mb-2">
                            Part {i + 1}
                          </p>
                          <div className="flex gap-3 text-[11px] font-semibold mb-1">
                            <button
                              type="button"
                              className={
                                seg.mode === "time"
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }
                              onClick={() => {
                                const updated = [...editForm.segments];
                                updated[i] = {
                                  ...updated[i],
                                  mode: "time",
                                  hoursWorked: "",
                                };
                                setEditForm((p) => ({
                                  ...p,
                                  segments: updated,
                                }));
                              }}
                            >
                              Time
                            </button>

                            <button
                              type="button"
                              className={
                                seg.mode === "hours"
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }
                              onClick={() => {
                                const updated = [...editForm.segments];
                                updated[i] = {
                                  ...updated[i],
                                  mode: "hours",
                                  startTime: "",
                                  endTime: "",
                                };
                                setEditForm((p) => ({
                                  ...p,
                                  segments: updated,
                                }));
                              }}
                            >
                              Hours
                            </button>
                          </div>

                          {/* Start / End */}
                          {/* TIME MODE */}
                          {seg.mode === "time" && (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="time"
                                value={seg.startTime}
                                onChange={(e) => {
                                  const updated = [...editForm.segments];
                                  updated[i].startTime = e.target.value;
                                  setEditForm((p) => ({
                                    ...p,
                                    segments: updated,
                                  }));
                                }}
                                className="field-input"
                              />
                              <input
                                type="time"
                                value={seg.endTime}
                                onChange={(e) => {
                                  const updated = [...editForm.segments];
                                  updated[i].endTime = e.target.value;
                                  setEditForm((p) => ({
                                    ...p,
                                    segments: updated,
                                  }));
                                }}
                                className="field-input"
                              />
                            </div>
                          )}

                          {/* HOURS MODE */}
                          {seg.mode === "hours" && (
                            <input
                              type="number"
                              step="0.5"
                              placeholder="Hours"
                              value={seg.hoursWorked}
                              onChange={(e) => {
                                const updated = [...editForm.segments];
                                updated[i].hoursWorked = Number(e.target.value);
                                setEditForm((p) => ({
                                  ...p,
                                  segments: updated,
                                }));
                              }}
                              className="field-input"
                            />
                          )}

                          <input
                            type="number"
                            placeholder="Rate"
                            value={seg.rate}
                            onChange={(e) => {
                              const updated = [...editForm.segments];
                              updated[i].rate = Number(e.target.value);
                              setEditForm((p) => ({ ...p, segments: updated }));
                            }}
                            className="field-input mt-2"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        className="text-xs text-blue-600"
                        onClick={() =>
                          setEditForm((p) => ({
                            ...p,
                            segments: [...p.segments, {}],
                          }))
                        }
                      >
                        + Add Segment
                      </button>
                    </div>
                  ) : (
                    /* SINGLE MODE (UNCHANGED) */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Start</label>
                          <input
                            type="time"
                            value={editForm.startTime}
                            disabled={!!editForm.hoursWorked}
                            onChange={(e) =>
                              handleEditChange("startTime", e.target.value)
                            }
                            className="field-input"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">End</label>
                          <input
                            type="time"
                            value={editForm.endTime}
                            disabled={!!editForm.hoursWorked}
                            onChange={(e) =>
                              handleEditChange("endTime", e.target.value)
                            }
                            className="field-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600">
                          Hours (optional)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={editForm.hoursWorked}
                          onChange={(e) =>
                            handleEditChange(
                              "hoursWorked",
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          className="field-input"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-600">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          value={editForm.rate}
                          onChange={(e) =>
                            handleEditChange("rate", Number(e.target.value))
                          }
                          className="field-input"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">
                            Rest (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.restMinutes}
                            onChange={(e) =>
                              handleEditChange(
                                "restMinutes",
                                Number(e.target.value),
                              )
                            }
                            className="field-input"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">
                            Missing (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.missingMinutes}
                            onChange={(e) =>
                              handleEditChange(
                                "missingMinutes",
                                Number(e.target.value),
                              )
                            }
                            className="field-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {editForm.status === "absent" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">
                    Reason for absence *
                  </label>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={(e) => handleEditChange("note", e.target.value)}
                    className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                    placeholder="Reason is required"
                  />
                </div>
              )}
            </div>

            {/* <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Remarks</label>
              <input
                type="text"
                value={editForm.remarks}
                onChange={(e) => handleEditChange("remarks", e.target.value)}
                className="border rounded-md p-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div> */}

            <div className="border-t border-gray-300 rounded-2xl px-5 py-4">
              <button
                onClick={handleUpdateAttendance}
                disabled={updateLoading}
                className={`primary-bg text-white px-4 py-2 rounded-xl w-full 
      flex items-center justify-center gap-2 transition ${
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
