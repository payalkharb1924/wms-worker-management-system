import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { Loader } from "lucide-react";

// Helpers for formatting
const formatDateTime = (d) => {
  if (!d) return "";
  const dateObj = new Date(d);
  const date = dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} • ${time}`;
};

const chipByType = (type) => {
  switch (type) {
    case "attendance":
      return {
        label: "Attendance",
        className: "bg-emerald-50 text-emerald-700",
      };
    case "advance":
      return { label: "Advance", className: "bg-rose-50 text-rose-700" };
    case "extra":
      return { label: "Extra", className: "bg-amber-50 text-amber-700" };
    case "settlement":
      return { label: "Settlement", className: "bg-sky-50 text-sky-700" };
    case "wallet":
      return {
        label: "Wallet",
        className: "bg-indigo-50 text-indigo-700",
      };

    default:
      return { label: "Entry", className: "bg-gray-50 text-gray-600" };
  }
};

const WorkerLedger = ({
  workerId,
  pendingSummary,
  summaryLoading,
  onSettleClick,
}) => {
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [entries, setEntries] = useState([]);

  // Fetch ledger entries when worker changes
  useEffect(() => {
    if (!workerId) return;

    const fetchLedger = async () => {
      try {
        setLedgerLoading(true);
        setLedgerError("");
        const res = await api.get(`/settlement/worker/${workerId}/ledger`);
        setEntries(res.data.entries || []);
      } catch (err) {
        console.error(err);
        setLedgerError("Failed to load entries");
      } finally {
        setLedgerLoading(false);
      }
    };

    fetchLedger();
  }, [workerId]);

  const netPending =
    pendingSummary?.amounts?.netPending != null
      ? pendingSummary.amounts.netPending
      : 0;

  const isAllClear = netPending === 0;
  const isFarmerWillGive = netPending > 0;
  const balanceLabel = isAllClear
    ? "All settled"
    : isFarmerWillGive
      ? "You will give"
      : "You will get";

  const balanceAmount = Math.abs(netPending);

  return (
    <div className="mt-4 space-y-3">
      {/* Top balance card (Khatabook-style) */}
      <div className="bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            {balanceLabel}
          </span>

          {summaryLoading ? (
            <span className="mt-1 h-5 w-24 rounded bg-gray-200 animate-pulse" />
          ) : (
            <span
              className={`mt-1 text-xl font-extrabold ${
                isAllClear
                  ? "text-gray-500"
                  : isFarmerWillGive
                    ? "text-red-500"
                    : "text-emerald-600"
              }`}
            >
              ₹{balanceAmount.toFixed(2)}
            </span>
          )}
        </div>

        <button
          onClick={onSettleClick}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            summaryLoading
              ? "bg-gray-200 text-gray-400"
              : isAllClear
                ? "bg-blue-100 text-blue-700"
                : "primary-bg text-white"
          }`}
        >
          {isAllClear ? "View Only" : "Settle now"}
        </button>
      </div>

      {/* Ledger header */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
        <span className="uppercase tracking-wide">Report</span>
        <span className="flex gap-3">
          <span className="text-emerald-600 font-semibold">You got</span>
          <span className="text-rose-500 font-semibold">You gave</span>
        </span>
      </div>

      {/* Ledger list */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 max-h-72 overflow-y-auto">
        {summaryLoading && ledgerLoading && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-400">
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-xs">Loading worker data...</span>
          </div>
        )}

        {!summaryLoading && ledgerError && (
          <p className="text-xs text-red-500 text-center py-4">{ledgerError}</p>
        )}

        {!ledgerLoading && entries.length === 0 && !ledgerError && (
          <p className="text-xs text-gray-500 text-center py-4">
            No entries yet. Start adding attendance, advances or extras.
          </p>
        )}

        {entries.map((entry) => {
          const chip = chipByType(entry.type);
          const isOut = entry.direction === "out"; // YOU GAVE
          const amountClass = isOut ? "text-red-500" : "text-emerald-600";

          return (
            <div
              key={entry._id}
              className={`
    rounded-xl px-4 py-3 mb-3 flex items-center justify-between
    backdrop-blur-md bg-white/70
    shadow-[0_8px_25px_rgba(0,0,0,0.08)]
    border border-white/60
    ${isOut ? "border-l-4 border-red-400" : "border-l-4 border-emerald-400"}
  `}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400">
                  {formatDateTime(entry.createdAt)}
                </span>
                <span className="text-xs text-gray-800">
                  {entry.label || "Entry"}
                </span>
                <span
                  className={`inline-flex mt-[2px] px-2 py-[1px] rounded-full text-[9px] max-w-20
                     font-medium ${chip.className}`}
                >
                  {chip.label}
                </span>
              </div>

              <div className="text-right">
                <span className={`block text-sm font-semibold ${amountClass}`}>
                  {isOut ? "₹" : "₹"}
                  {entry.amount.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400">
                  {isOut ? "You gave" : "You got"}
                </span>
              </div>
            </div>
          );
        })}

        {ledgerLoading && (
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-gray-400">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-[11px]">Loading entries...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerLedger;
