import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { Loader } from "lucide-react";
import { toast } from "react-toastify";

const AttendanceTab = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("daily");
  const [saving, setSaving] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    if (!startDate || !endDate) {
      return toast.error("Select both start & end date!");
    }
    try {
      setHistoryLoading(true);
      const res = await api.get(
        `/attendance/range?startDate=${startDate}&endDate=${endDate}`
      );
      setHistory(res.data.attendance || []);
    } catch (error) {
      toast.error("Failed to fetch attendance history");
    } finally {
      setHistoryLoading(false);
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
      }));
    });
  }, [applyToAll]);

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
            <div className="space-y-4">
              {workers.map((w) => {
                const hours =
                  w.startTime && w.endTime
                    ? (
                        (new Date(`2000-01-01T${w.endTime}`) -
                          new Date(`2000-01-01T${w.startTime}`)) /
                        (1000 * 60 * 60)
                      ).toFixed(2)
                    : "--";

                const total =
                  hours !== "--" && w.rate ? (hours * w.rate).toFixed(2) : "--";

                return (
                  <div
                    key={w._id}
                    className="bg-white shadow rounded-lg p-3 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{w.name}</p>
                      <label className="text-xs flex items-center gap-1">
                        Present
                        <label className="toggle-switch">
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

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-medium">Start</label>
                        <input
                          type="time"
                          value={w.startTime || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "startTime", e.target.value)
                          }
                          className="border focus:outline-none p-2 rounded text-sm max-w-[120px] focus:border-[var(--primary)]"
                        />
                      </div>

                      <div className="flex flex-col space-y-1 items-end">
                        <label className="text-xs font-medium">End</label>
                        <input
                          type="time"
                          value={w.endTime || ""}
                          onChange={(e) =>
                            updateWorker(w._id, "endTime", e.target.value)
                          }
                          className="border focus:outline-none p-2 rounded text-sm max-w-[120px] focus:border-[var(--primary)]"
                        />
                      </div>
                    </div>

                    {/* Rate */}
                    <div className="flex flex-col space-y-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="Rate (₹)"
                        value={w.rate || ""}
                        onChange={(e) =>
                          updateWorker(w._id, "rate", Number(e.target.value))
                        }
                        className="border focus:outline-none p-2 rounded text-sm w-full focus:border-[var(--primary)]"
                      />
                    </div>

                    {/* Calculations */}
                    <div className="mt-2 flex justify-between text-sm text-gray-500">
                      <p>Hours: {hours}</p>
                      <p>Total: ₹ {total}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Button */}
          <button
            className={`w-full mt-5 py-3 rounded-lg text-white font-bold ${
              saving ? "bg-orange-300" : "primary-bg"
            }`}
            onClick={handleSaveAttendance}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}

      {/* HISTORY TAB PLACEHOLDER */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Date range filter */}
          <div className="bg-white rounded-lg p-3 shadow">
            <label className="text-sm font-medium">View Attendance</label>
            <div className="flex gap-2 mt-2">
              <input
                type="date"
                className="border rounded p-2 text-sm flex-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className="border rounded p-2 text-sm flex-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button
                className="primary-bg text-white px-4 rounded text-sm"
                onClick={fetchAttendanceHistory}
              >
                Search
              </button>
            </div>
          </div>
          {historyLoading && (
            <div className="text-center text-gray-500 py-10">
              Loading history...
            </div>
          )}
          {!historyLoading && history.length === 0 && (
            <p className="text-gray-500 text-center">No attendance found.</p>
          )}
          {/* List */}
          {history.map((item, index) => (
            <div key={index} className="bg-white shadow p-3 rounded-lg">
              <p className="font-semibold">
                {new Date(item.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-gray-600 text-sm">
                Worker ID: {item.workerId}
              </p>
              <p className="text-gray-600 text-sm">Hours: {item.hoursWorked}</p>
              <p className="text-gray-600 text-sm font-semibold">
                ₹ {item.total}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;
