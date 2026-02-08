import React, { useEffect, useState } from "react";
import api from "../api/axios.js";
import { toast } from "react-toastify";
import { Loader, X } from "lucide-react";
import WorkerLedger from "./WorkerLedger.jsx";
import MonthWiseSettleModal from "./MonthWiseSettleModal.jsx";
import { goToNextTourStep } from "../tour/useShepherdTour.js";
import { createAttendanceTour } from "../tour/useAttendanceTour";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const WorkersTab = () => {
  const [workers, setWorkers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    remarks: "",
    status: "active",
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pendingSummary, setPendingSummary] = useState(null);
  const [showSettlePopup, setShowSettlePopup] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [showMonthWiseSettlePopup, setShowMonthWiseSettlePopup] =
    useState(false);

  const [settleForm, setSettleForm] = useState({
    startDate: "",
    endDate: "",
    note: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showFinalSettleConfirm, setShowFinalSettleConfirm] = useState(false);

  const handleUpdateWorker = async (id) => {
    try {
      setUpdateLoading(true);
      await api.put(`/workers/${id}`, editForm);
      toast.success("Worker updated!");
      setEditing(false);
      setShowDetails(false);
      fetchWorkers();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.msg || "Update failed");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteWorker = async (id) => {
    try {
      setDeleteLoading(true);
      await api.delete(`/workers/${id}`);
      toast.success("Worker deleted!");
      setShowDetails(false);
      fetchWorkers();
    } catch (error) {
      toast.error(error.response?.data?.msg || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const [form, setForm] = useState({
    name: "",
    remarks: "",
  });
  const fetchWorkers = async () => {
    try {
      setFetchLoading(true);
      const res = await api.get("/workers");
      setWorkers(res.data.workers || []);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load workers.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/workers", form);
      toast.success("Worker added!");

      setShowForm(false);
      setForm({ name: "", remarks: "" });
      await fetchWorkers();

      setTimeout(() => {
        goToNextTourStep(); // will go to worker-card step
      }, 300);
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.msg || "Add worker failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerSummary = async (workerId) => {
    try {
      setSummaryLoading(true);
      const res = await api.get(`/settlement/worker/${workerId}/pending`);
      setPendingSummary(res.data);
    } catch (err) {
      toast.error("Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const openWorkerDetails = (worker) => {
    setSelectedWorker(worker);
    setPendingSummary(null);
    setShowDetails(true);

    // NEW: Load summary when popup opens
    fetchWorkerSummary(worker._id);
  };

  const handleSettlementConfirm = async () => {
    if (!settleForm.startDate) {
      return toast.error("Nothing pending to settle");
    }

    setSettleLoading(true);
    try {
      await api.post(`/settlement/worker/${selectedWorker._id}/settle`, {
        startDate: settleForm.startDate,
        endDate: settleForm.endDate,
        note: settleForm.note,
      });

      toast.success("Settlement saved!");

      // CLOSE ALL RELATED POPUPS
      setShowSettlePopup(false);
      setShowFinalSettleConfirm(false);

      // Refresh data
      fetchWorkerSummary(selectedWorker._id);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Settlement failed");
    } finally {
      setSettleLoading(false);
    }
  };

  const confirmDeleteWorker = async () => {
    if (!deletePassword) return toast.error("Enter your password!");

    try {
      setDeleteLoading(true);

      // Verify password (custom API)
      await api.post("/auth/verify-password", { password: deletePassword });

      // If password correct → delete worker
      await api.delete(`/workers/${selectedWorker._id}`);

      toast.success("Worker deleted successfully");
      setShowDeleteConfirm(false);
      setShowDetails(false);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Incorrect password!");
    } finally {
      setDeletePassword("");
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (showSettlePopup && pendingSummary) {
      setSettleForm({
        startDate: pendingSummary.suggestedStartDate || "",
        endDate: pendingSummary.suggestedEndDate || "",
        note: "",
      });
    }
  }, [showSettlePopup, pendingSummary]);

  useEffect(() => {
    if (!showDetails) return;

    // Push state when worker modal opens
    window.history.pushState({ workerDetails: true }, "");

    const handleBack = () => {
      setShowDetails(false);
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, [showDetails]);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-bold">Workers</h3>
        <button
          onClick={() => {
            setShowForm(true);
          }}
          className="add-worker-btn primary-bg text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition"
        >
          + Add Worker
        </button>
      </div>
      {/* Workers list */}
      {fetchLoading ? (
        <div className="flex justify-center py-10">
          <Loader className="w-10 h-10 animate-spin text-[var(--primary)]" />
        </div>
      ) : workers.length === 0 ? (
        <p className="text-gray-500 text-sm">No workers added yet.</p>
      ) : (
        <div className="space-y-3">
          {workers.map((w, index) => (
            <div
              key={w._id}
              onClick={() => openWorkerDetails(w)}
              className={`p-4 bg-white rounded-2xl flex justify-between items-start cursor-pointer
border border-gray-200/80
hover:shadow-md hover:bg-white
transition-all duration-200 active:scale-[0.99] ${
                index === 0 ? "worker-card" : ""
              }`}
            >
              <div className="flex flex-col space-y-1">
                <p className="font-semibold text-gray-800 text-sm">{w.name}</p>
                {w.remarks && (
                  <p className="text-[11px] text-gray-500">{w.remarks}</p>
                )}
              </div>
              {w.status && (
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                    w.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {w.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add worker Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[90%] max-w-sm shadow-xl space-y-3">
            <h3 className="font-bold mb-3 text-lg ">Add Worker</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Worker Name"
                className="worker-name-input w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
focus:border-[var(--primary)] transition
"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <input
                type="text"
                placeholder="Remarks (optional)"
                className="worker-remarks-input w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
focus:border-[var(--primary)] transition
"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className={`save-worker-btn text-white px-4 py-2 rounded-md w-full ${
                    loading ? "bg-orange-300 cursor-not-allowed" : "primary-bg"
                  }`}
                >
                  {loading ? (
                    <div className="flex justify-center items-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    "Add"
                  )}
                </button>
                <button
                  type="button"
                  className="bg-gray-300 px-4 py-2 rounded-md w-full"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDetails && selectedWorker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end z-40">
          <div
            className="bg-white w-full max-w-md p-6 rounded-t-3xl shadow-2xl animate-slide-up"
            style={{ animationDuration: "0.3s" }}
          >
            {!editing ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-bold text-2xl mb-2">Worker Details</h3>
                    <p className="font-semibold text-base text-gray-800">
                      {selectedWorker.name}
                    </p>
                    {selectedWorker.remarks && (
                      <p className="text-sm text-gray-600">
                        {selectedWorker.remarks}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full h-fit">
                    {selectedWorker.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    className="edit-worker-btn bg-blue-800 text-white py-2.5 rounded-xl font-semibold active:scale-95 transition text-sm"
                    onClick={() => {
                      setEditing(true);
                      setEditForm({
                        name: selectedWorker.name,
                        remarks: selectedWorker.remarks,
                        status: selectedWorker.status,
                      });
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-worker-btn bg-red-500 text-white py-2.5 rounded-xl font-semibold active:scale-95 transition text-sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" /> Deleting...
                      </div>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
                {/* Summary Section */}
                {/* Worker ledger (Khatabook-style) */}
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <WorkerLedger
                    workerId={selectedWorker._id}
                    pendingSummary={pendingSummary}
                    summaryLoading={summaryLoading}
                    onSettleClick={() => setShowSettlePopup(true)}
                  />
                </div>

                <button
                  onClick={() => {
                    setShowDetails(false);
                    window.history.back(); // sync history
                  }}
                  className="w-full mt-3 py-2 bg-gray-200 rounded-md text-sm font-medium"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-xl mb-3">Edit Workers</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    className="w-full border-b p-2 rounded-md focus:outline-none focus:border-[var(--primary)]"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />

                  <input
                    type="text"
                    className="w-full border-b p-2 rounded-md focus:outline-none focus:border-[var(--primary)]"
                    placeholder="Remarks"
                    value={editForm.remarks}
                    onChange={(e) =>
                      setEditForm({ ...editForm, remarks: e.target.value })
                    }
                  />
                  <select
                    className="w-full border p-2 rounded-md"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="flex gap-2 mt-3">
                    <button
                      className="primary-bg text-white flex-1 py-2 rounded"
                      onClick={() => handleUpdateWorker(selectedWorker._id)}
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" /> Saving...
                        </div>
                      ) : (
                        "Save"
                      )}
                    </button>

                    <button
                      className="bg-gray-400 text-white flex-1 py-2 rounded"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* SETTLE PAYMENT POPUP */}
      {showSettlePopup && pendingSummary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[90%] max-w-sm p-6 rounded-2xl shadow-xl space-y-4 relative">
            <button
              onClick={() => setShowSettlePopup(false)}
              className="
    absolute top-4 right-4
    text-gray-400 hover:text-gray-600
    transition
  "
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold">Settle payments</h3>

            <p className="text-sm text-gray-600">
              How would you like to settle the pending amount?
            </p>

            {/* DETAILS BOX (restored ✅) */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="font-medium">
                  {formatDate(settleForm.startDate)} →{" "}
                  {formatDate(settleForm.endDate)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Net amount</span>
                <span className="font-bold text-[var(--primary)]">
                  ₹{pendingSummary.amounts.netPending}
                </span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="space-y-3 pt-2">
              {/* Month-wise */}
              <button
                className="w-full primary-bg hover:bg-gray-200 py-2.5 text-white rounded-xl font-semibold transition"
                onClick={() => {
                  setShowSettlePopup(false);
                  setShowMonthWiseSettlePopup(true);
                }}
              >
                Month-wise settlement
              </button>
              {/* Settle all */}
              <button
                className="w-full bg-gray-200 hover:bg-gray-300  text-gray-400 py-2.5 rounded-xl font-medium transition"
                onClick={() => {
                  setShowSettlePopup(false);
                  setShowFinalSettleConfirm(true); // 👈 NEW
                }}
              >
                Settle all at once
              </button>
            </div>
          </div>
        </div>
      )}
      {showFinalSettleConfirm && pendingSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white w-[90%] max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Settle Payment</h3>

            <p className="text-sm text-gray-500">
              Settlement period is auto-calculated and cannot be changed.
            </p>

            {/* DATE RANGE */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input
                  type="date"
                  value={settleForm.startDate}
                  disabled
                  className="border rounded-lg p-2 w-full bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input
                  type="date"
                  value={settleForm.endDate}
                  disabled
                  className="border rounded-lg p-2 w-full bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* NOTE */}
            <input
              type="text"
              placeholder="Payment note (optional)"
              className="border rounded-lg p-2 text-sm w-full"
              value={settleForm.note}
              onChange={(e) =>
                setSettleForm({ ...settleForm, note: e.target.value })
              }
            />

            {/* AMOUNT */}
            <div className="text-right font-bold text-[var(--primary)] text-xl">
              ₹{pendingSummary.amounts.netPending}
            </div>

            {/* CONFIRM */}
            <button
              className="primary-bg w-full py-2.5 rounded-xl text-white font-semibold"
              disabled={settleLoading}
              onClick={() => {
                setShowFinalSettleConfirm(false);
                handleSettlementConfirm(); // OLD LOGIC
              }}
            >
              {settleLoading ? (
                <div className="flex justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Settling...
                </div>
              ) : (
                "Confirm Settlement"
              )}
            </button>

            {/* CANCEL */}
            <button
              className="w-full py-2 bg-gray-200 rounded-xl text-sm"
              onClick={() => setShowFinalSettleConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 w-[90%] max-w-md rounded-2xl shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-red-600">Confirm Delete</h3>
            <p className="text-sm text-gray-700">
              Deleting a worker will permanently remove all data related to:
              <strong> {selectedWorker.name}</strong>. This cannot be undone!
            </p>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
focus:outline-none focus:ring-2 focus:ring-red-200
"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />

            <button
              className="bg-red-600 text-white w-full py-2 rounded-lg font-semibold"
              disabled={deleteLoading}
              onClick={confirmDeleteWorker}
            >
              {deleteLoading ? (
                <div className="flex justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Deleting...
                </div>
              ) : (
                "Confirm Delete"
              )}
            </button>

            <button
              className="w-full py-2 bg-gray-200 rounded-lg text-sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Month-wise Settle Modal */}
      <MonthWiseSettleModal
        isOpen={showMonthWiseSettlePopup}
        onClose={() => setShowMonthWiseSettlePopup(false)}
        worker={selectedWorker}
        onSettlementComplete={() => {
          fetchWorkers();
          fetchWorkerSummary(selectedWorker._id);
        }}
      />
    </div>
  );
};

export default WorkersTab;
