import React, { useState, useEffect } from "react";
import api from "../api/axios.js";
import { toast } from "react-toastify";
import { Loader, Download, Eye, AlertTriangle, X } from "lucide-react";

const formatDateHuman = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const MonthWiseSettleModal = ({
  isOpen,
  onClose,
  worker,
  onSettlementComplete,
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeTillToday, setIncludeTillToday] = useState(true);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Auto-calculate start date when modal opens (only in settlement mode)
  useEffect(() => {
    if (isOpen && worker && !isViewMode) {
      fetchStartDate();
      // Set default end date to today
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (isOpen && worker && isViewMode) {
      // In view mode, set both dates to today initially
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
    }
  }, [isOpen, worker, isViewMode]);

  // Auto-fetch summary when dates or toggle change
  useEffect(() => {
    if (startDate && endDate && worker) {
      fetchSummary();
    }
  }, [startDate, endDate, includeTillToday, worker]);

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modal: true }, "");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleBack = () => {
      if (isOpen) {
        onClose();
      }
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    onClose();
    window.history.back();
  };

  const fetchStartDate = async () => {
    try {
      const res = await api.get(
        `/settlement/worker/${worker._id}/last-settlement`,
      );
      const suggestedStartDate = res.data.suggestedStartDate;

      if (suggestedStartDate) {
        setStartDate(suggestedStartDate);
      } else {
        // Fallback to today if no entries
        setStartDate(new Date().toISOString().split("T")[0]);
      }
    } catch (error) {
      console.error("Failed to fetch start date:", error);
      // Fallback to worker joining date
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  };

  const fetchSummary = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const res = await api.get(
        `/settlement/worker/${worker._id}/month-wise-summary`,
        {
          params: {
            startDate,
            endDate,
            includeTillToday,
            isViewMode,
          },
        },
      );
      setSummary(res.data);
    } catch (error) {
      toast.error("Failed to load summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(
        `/settlement/worker/${worker._id}/month-wise-pdf`,
        {
          params: {
            startDate,
            endDate,
            includeTillToday,
            isViewMode,
          },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `settlement-${worker.name}-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleSettleClick = () => {
    if (!summary) return;

    setShowConfirmPopup(true);
  };

  const handleConfirmSettle = async () => {
    setSettling(true);
    try {
      await api.post(`/settlement/worker/${worker._id}/month-wise-settle`, {
        startDate,
        endDate,
        includeTillToday,
        note: `Month-wise settlement till ${endDate}`,
      });

      toast.success("Settlement completed successfully!");
      onSettlementComplete();
      handleClose();
      setShowConfirmPopup(false);
    } catch (error) {
      toast.error(error.response?.data?.msg || "Settlement failed");
    } finally {
      setSettling(false);
    }
  };

  const groupedByMonth = React.useMemo(() => {
    if (!summary?.entries) return {};

    return summary.entries.reduce((acc, entry) => {
      const monthKey = new Date(entry.date).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(entry);

      return acc;
    }, {});
  }, [summary]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-white w-[95%] p-4 max-w-3xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
          {/* Close Button (Top Right) */}
          <button
            onClick={handleClose}
            aria-label="Close"
            className="
    margin-left-auto
    self-end
    p-2 rounded-lg
    text-gray-500
    hover:text-gray-800 hover:bg-gray-100
    active:scale-95
    transition
  "
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-bold px-6 mb-2">
            {isViewMode ? "View Month-wise Entries" : "Settle Month-wise"}
          </h3>

          {/* Mode Selector */}
          <div className="px-6 mt-1 mb-3">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              {/* Settlement Mode */}
              <button
                type="button"
                onClick={() => setIsViewMode(false)}
                className={`
        px-4 py-2 text-sm font-medium rounded-lg transition
        ${
          !isViewMode
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }
      `}
              >
                Settlement Mode
              </button>

              {/* View Mode */}
              <button
                type="button"
                onClick={() => setIsViewMode(true)}
                className={`
        px-4 py-2 text-sm font-medium rounded-lg transition
        ${
          isViewMode
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }
      `}
              >
                View Mode
              </button>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-4 mb-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!isViewMode}
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${
                    isViewMode
                      ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "bg-gray-50 cursor-not-allowed"
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isViewMode ? "Select start date" : "Auto-calculated"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              {/* Text */}
              <div>
                <p className="text-xs font-medium text-gray-800">
                  Include advances & extras till today
                </p>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setIncludeTillToday((prev) => !prev)}
                className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition
      ${includeTillToday ? "primary-bg" : "bg-gray-300"}
    `}
              >
                <span
                  className={`
        inline-block h-5 w-5 transform rounded-full bg-white transition
        ${includeTillToday ? "translate-x-5" : "translate-x-1"}
      `}
                />
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">
                Loading summary...
              </span>
            </div>
          )}

          {/* Summary Table */}
          <div className="p-2 space-y-6 overflow-y-auto flex-1">
            {summary && !loading && (
              <div className="mb-3">
                <h4 className="font-semibold mb-3">
                  Summary
                  <span className="text-xs text-gray-500 ml-2">
                    (Pending Entries Only)
                  </span>
                </h4>

                <div className="bg-gray-50 rounded-lg p-2 mb-1">
                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr className="border-b">
                          <th className="text-left py-3 px-3 w-[60px]">Date</th>
                          <th className="text-left py-3 px-3 w-[80px]">
                            Entry Type
                          </th>
                          <th className="text-left py-3 px-3 w-[120px]">
                            Description
                          </th>
                          <th className="text-right py-3 px-3 w-[100px]">
                            To be Paid
                          </th>
                          <th className="text-right py-3 px-3 w-[100px]">
                            Paid
                          </th>

                          <th className="text-right py-3 px-3 w-[120px]">
                            Balance
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {Object.entries(groupedByMonth).map(
                          ([month, entries]) => {
                            // month totals
                            let monthPaid = 0;
                            let monthEarned = 0;

                            // rate-wise hours
                            const rateWise = {};

                            entries.forEach((e) => {
                              if (!e.settled) {
                                monthPaid += e.debit || 0;
                                monthEarned += e.credit || 0;
                              }

                              if (
                                e.type === "attendance" &&
                                e.hoursWorked &&
                                e.rate
                              ) {
                                if (!rateWise[e.rate]) {
                                  rateWise[e.rate] = { hours: 0, amount: 0 };
                                }
                                rateWise[e.rate].hours += e.hoursWorked;
                                rateWise[e.rate].amount +=
                                  e.hoursWorked * e.rate;
                              }
                            });

                            return (
                              <React.Fragment key={month}>
                                {/* Month Header */}
                                <tr className="bg-gray-100">
                                  <td
                                    colSpan={6}
                                    className="px-3 py-2 font-semibold text-gray-700 uppercase text-xs"
                                  >
                                    {month}
                                  </td>
                                </tr>

                                {/* Month Entries */}
                                {entries.map((entry, index) => (
                                  <tr
                                    key={index}
                                    className={`border-b ${
                                      entry.settled
                                        ? "text-gray-400 line-through"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      {formatDateHuman(entry.date)}
                                    </td>

                                    <td className="px-3 py-3 capitalize whitespace-nowrap">
                                      {entry.settled && (
                                        <span className="text-blue-500 mr-1">
                                          •
                                        </span>
                                      )}
                                      {entry.type}
                                    </td>

                                    <td className="px-3 py-3 text-gray-700">
                                      {entry.description}
                                    </td>

                                    <td className="px-3 py-3 text-right text-green-600">
                                      {entry.credit > 0
                                        ? `₹${entry.credit}`
                                        : "—"}
                                    </td>

                                    <td className="px-3 py-3 text-right text-red-600">
                                      {entry.debit > 0 ? `₹${entry.debit}` : ""}
                                    </td>

                                    <td className="px-3 py-3 text-right font-semibold">
                                      {entry.settled
                                        ? "—"
                                        : `₹${entry.runningBalance}`}
                                    </td>
                                  </tr>
                                ))}

                                {/* Rate-wise Hours Summary */}
                                {Object.keys(rateWise).length > 0 && (
                                  <tr>
                                    <td colSpan={6}>
                                      <div className="grid grid-cols-[1fr_260px] gap-4 mt-2">
                                        <div />

                                        <div className="border rounded-xl bg-white p-3 text-xs space-y-1">
                                          <p className="font-semibold text-gray-700">
                                            Hours Summary (Rate-wise)
                                          </p>

                                          {Object.entries(rateWise).map(
                                            ([rate, data]) => (
                                              <div
                                                key={rate}
                                                className="flex justify-between text-gray-600"
                                              >
                                                <span>
                                                  {data.hours} hr @ ₹{rate}
                                                </span>
                                                <span className="font-medium">
                                                  ₹{data.amount}
                                                </span>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}

                                {/* Month Summary BOX */}
                                <tr>
                                  <td colSpan={6}>
                                    <div className="grid grid-cols-[1fr_260px] gap-4">
                                      {/* LEFT = spacer (keeps alignment) */}
                                      <div />

                                      {/* RIGHT = Month Summary */}
                                      <div className="border rounded-xl bg-gray-50 p-3 text-sm space-y-2">
                                        <p className="font-semibold">
                                          Month Summary
                                        </p>

                                        <div className="flex justify-between">
                                          <span>Paid</span>
                                          <span className="text-red-600">
                                            ₹{monthPaid}
                                          </span>
                                        </div>

                                        <div className="flex justify-between">
                                          <span>Earned</span>
                                          <span className="text-green-600">
                                            ₹{monthEarned}
                                          </span>
                                        </div>

                                        <div className="flex justify-between font-semibold border-t pt-1">
                                          <span>Net for Month</span>
                                          <span>
                                            ₹{monthEarned - monthPaid}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          },
                        )}
                      </tbody>

                      <tfoot className="bg-gray-50">
                        <tr className="border-t-2 font-semibold">
                          <td colSpan="3" className="px-3 py-3 text-right">
                            Totals
                          </td>
                          <td className="px-3 py-3 text-right text-red-600">
                            ₹{summary.totals.totalDebits}
                          </td>
                          <td className="px-3 py-3 text-right text-green-600">
                            ₹{summary.totals.totalCredits}
                          </td>
                          <td className="px-3 py-3 text-right">
                            ₹{summary.totals.netPayable}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Legend */}
          {isViewMode && (
            <div className="text-xs text-gray-600 mb-1">
              <span className="text-blue-500">•</span> Already settled entries
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-4">
            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="
      flex-1 flex items-center justify-center gap-2
      rounded-xl px-2 py-1
      bg-emerald-600 text-white
      text-sm font-medium
      shadow-sm
      hover:bg-emerald-700
      active:scale-[0.98]
      transition
    "
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>

            {/* Settle Button */}
            {!isViewMode && (
              <button
                onClick={handleSettleClick}
                disabled={settling}
                className="
        flex-1 flex items-center justify-center gap-2
        rounded-xl px-2 py-1
        primary-bg text-white
        text-sm font-medium
        shadow-sm
        hover:bg-orange-600
        active:scale-[0.98]
        transition
        disabled:opacity-60 disabled:cursor-not-allowed
      "
              >
                {settling ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Settling…
                  </>
                ) : (
                  <>Settle till {formatDateHuman(endDate)}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-white p-6 rounded-2xl w-[90%] max-w-sm shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-bold">Confirm Settlement</h3>
            </div>

            <p className="text-sm text-gray-700">
              Are you sure you want to settle all entries till{" "}
              <strong>{endDate}</strong>?
            </p>

            {summary && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Credits:</span>
                    <span className="text-green-600 font-semibold">
                      ₹{summary.totals.totalCredits}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Debits:</span>
                    <span className="text-red-600 font-semibold">
                      ₹{summary.totals.totalDebits}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Net Amount:</span>
                    <span className="font-bold">
                      ₹{summary.totals.netPayable}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              This action cannot be undone. All entries in this date range will
              be marked as settled.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmPopup(false)}
                className="flex-1 py-2 bg-gray-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSettle}
                disabled={settling}
                className="flex-1 primary-bg text-white py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {settling ? "Processing..." : "Confirm Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default MonthWiseSettleModal;
