import React, { useEffect, useState } from "react";
import api from "../api/axios.js";
import { toast } from "react-toastify";
import { Loader } from "lucide-react";

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
      fetchWorkers();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.msg || "Add worker failed");
    } finally {
      setLoading(false);
    }
  };

  const openWorkerDetails = (worker) => {
    setSelectedWorker(worker);
    setShowDetails(true);
  };

  useEffect(() => {
    fetchWorkers();
  }, []);
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">Workers</h3>
        <button
          onClick={() => setShowForm(true)}
          className="primary-bg text-white px-3 py-2 rounded-lg text-sm"
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
          {workers.map((w) => (
            <div
              key={w._id}
              onClick={() => openWorkerDetails(w)}
              className="p-3 bg-gray-100 rounded-lg flex justify-between items-start cursor-pointer hover:bg-gray-200 transition"
            >
              <div className="flex flex-col space-y-1">
                <p className="font-semibold">{w.name}</p>
                {w.remarks && (
                  <p className="text-xs text-gray-500">{w.remarks}</p>
                )}
              </div>
              {w.status && (
                <span
                  className={`text-xs px-2 py-1 rounded self-start ${
                    w.status === "active"
                      ? "text-green-800 bg-green-200"
                      : "bg-red-200 text-red-800"
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
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center">
          <div className="bg-white p-5 rounded-xl w-80 shadow-lg">
            <h3 className="font-bold mb-3 text-lg">Add Worker</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Worker Name"
                className="w-full border-b rounded-md p-2 focus:outline-none focus:border-[var(--primary)]"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <input
                type="text"
                placeholder="Remarks (optional)"
                className="w-full border-b rounded-md p-2 focus:outline-none focus:border-[var(--primary)]"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className={`text-white px-4 py-2 rounded-md w-full ${
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-end">
          <div
            className="bg-white w-full max-w-md p-6 rounded-t-2xl shadow-xl animate-slide-up"
            style={{ animationDuration: "0.3s" }}
          >
            {!editing ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-bold text-2xl mb-2">Worker Details</h3>
                    <p className="font-semibold text-lg">
                      {selectedWorker.name}
                    </p>
                    {selectedWorker.remarks && (
                      <p className="text-sm text-gray-600">
                        {selectedWorker.remarks}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] bg-green-200 text-green-800 px-2 py-1 rounded h-fit">
                    {selectedWorker.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    className="bg-blue-500 text-white flex-1 py-2 rounded-md font-semibold"
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
                    className="bg-red-500 text-white flex-1 py-2 rounded-md font-semibold"
                    onClick={() => handleDeleteWorker(selectedWorker._id)}
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
                <button
                  onClick={() => setShowDetails(false)}
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
    </div>
  );
};

export default WorkersTab;
