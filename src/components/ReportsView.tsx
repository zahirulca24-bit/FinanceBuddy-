import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import {
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Transaction } from "../types";

export const ReportsView: React.FC = () => {
  const {
    transactions,
    accounts,
    deleteTransaction,
    clearAllData,
    seedDefaults
  } = useFinance();

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "daily" | "monthly" | "yearly" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // e.g., "2026-07"
  const [selectedYear, setSelectedYear] = useState("2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT"
    }).format(val).replace("BDT", "৳");
  };

  // Run the filtering logic
  const getFilteredTransactions = (): Transaction[] => {
    const todayStr = new Date().toISOString().split("T")[0];

    return transactions.filter((tx) => {
      // 1. Text Search
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.referenceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Date Filtering
      if (filterType === "daily") {
        return tx.date === todayStr;
      }
      if (filterType === "monthly") {
        return tx.date.startsWith(selectedMonth); // e.g., "2026-07"
      }
      if (filterType === "yearly") {
        return tx.date.startsWith(selectedYear); // e.g., "2026"
      }
      if (filterType === "custom") {
        const afterStart = startDate ? tx.date >= startDate : true;
        const beforeEnd = endDate ? tx.date <= endDate : true;
        return afterStart && beforeEnd;
      }

      return true; // "all"
    });
  };

  const filteredTx = getFilteredTransactions();

  const filteredIncome = filteredTx
    .filter((tx) => tx.type === "Income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const filteredExpenses = filteredTx
    .filter((tx) => tx.type === "Expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const filteredNet = filteredIncome - filteredExpenses;

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction permanently from ledger?")) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        alert("Failed to delete transaction");
      }
    }
  };

  const handleResetWorkspace = async () => {
    if (window.confirm("WARNING: This will wipe your database! Are you sure you want to delete all transactions, accounts, and custom categories?")) {
      try {
        await clearAllData();
        await seedDefaults();
        alert("Workspace cleared and seeded with defaults.");
      } catch (err) {
        alert("Failed to clear data.");
      }
    }
  };

  // EXCEL EXPORT (Downloads a CSV file parsed correctly by Excel)
  const handleExcelExport = () => {
    if (filteredTx.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["Date", "Type", "Account", "Category", "Description", "Amount", "Method", "Reference", "Notes", "Outstanding Status"];
    
    const rows = filteredTx.map((tx) => {
      const accObj = accounts.find((a) => a.id === tx.account);
      const accLabel = accObj ? accObj.name : "Unknown Account";
      const statusLabel = (tx.isReceivable || tx.isPayable) 
        ? (tx.isCleared ? "Cleared" : (tx.isReceivable ? "Owed" : "Due"))
        : "N/A";

      return [
        tx.date,
        tx.type,
        accLabel,
        tx.category,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.amount,
        tx.paymentMethod || "",
        tx.referenceNumber || "",
        `"${(tx.notes || "").replace(/"/g, '""')}"`,
        statusLabel
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Finance_Buddy_Statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF EXPORT
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0 print:bg-white animate-fade-in">
      {/* Controls panel - hidden when printing */}
      <div className="flex flex-col sm:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 print:hidden">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">
            Reports & Statement Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Search, filter, print statements, and export full-ledger balance sheets</p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExcelExport}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center shadow-sm transition cursor-pointer"
          >
            <Download className="h-4 w-4 mr-1.5 text-blue-600" />
            <span>Export to CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center shadow-sm transition cursor-pointer"
          >
            <Printer className="h-4 w-4 mr-1.5 text-blue-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel - hidden when printing */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
            />
          </div>

          {/* Range Type */}
          <div>
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-white font-semibold text-slate-700 transition-all"
            >
              <option value="all">All Entries</option>
              <option value="daily">Daily Today</option>
              <option value="monthly">Monthly Interval</option>
              <option value="yearly">Yearly Summary</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Conditional Inputs */}
          {filterType === "monthly" && (
            <div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-white font-mono font-bold"
              />
            </div>
          )}

          {filterType === "yearly" && (
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-white font-mono font-bold text-slate-700"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          )}

          {filterType === "custom" && (
            <div className="flex items-center space-x-1 sm:col-span-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none font-mono"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:border-b-2 print:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 print:text-lg">Ledger Statement Sheet</h3>
            <p className="text-xs text-slate-400 print:text-xs">
              Showing {filteredTx.length} records matching current criteria
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono uppercase print:block hidden">
            Printed: {new Date().toLocaleDateString()}
          </span>
        </div>

        {/* Quick range statistics summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60 print:bg-slate-50 print:border-slate-300">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Period Income</span>
            <span className="text-sm font-bold text-emerald-600 font-mono">{formatCurrency(filteredIncome)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Period Expenses</span>
            <span className="text-sm font-bold text-rose-600 font-mono">{formatCurrency(filteredExpenses)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Period Net Flow</span>
            <span className={`text-sm font-bold font-mono ${filteredNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {filteredNet >= 0 ? "+" : ""}{formatCurrency(filteredNet)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Ledger Records</span>
            <span className="text-sm font-bold text-slate-700 font-mono">{filteredTx.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-sans uppercase text-[10px] tracking-wider print:bg-slate-100 print:text-slate-800">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Account</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount (৳)</th>
                <th className="p-3 print:hidden">Ref / Tx ID</th>
                <th className="p-3 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-semibold italic">
                    No transactions found matching selection.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const accObj = accounts.find((a) => a.id === tx.account);
                  const accLabel = accObj ? accObj.name : "Unknown";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition font-medium text-slate-700">
                      <td className="p-3 font-mono font-bold text-slate-400 print:text-slate-900">{tx.date}</td>
                      <td className="p-3">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                            tx.type === "Income"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : tx.type === "Expense"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{accLabel}</td>
                      <td className="p-3 text-slate-500 font-semibold">{tx.category}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        {tx.description}
                        {tx.notes && (
                          <span className="block text-[10px] text-slate-400 font-normal mt-0.5 font-sans">
                            {tx.notes}
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-3 text-right font-sans font-bold text-sm ${
                          tx.type === "Income"
                            ? "text-emerald-600"
                            : tx.type === "Expense"
                            ? "text-rose-600"
                            : "text-blue-600"
                        }`}
                      >
                        {tx.type === "Income" ? "+" : tx.type === "Expense" ? "-" : ""}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3 font-mono text-slate-400 print:hidden">{tx.referenceNumber || "-"}</td>
                      <td className="p-3 text-center print:hidden">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dangerous/Config row - hidden when printing */}
      <div className="bg-rose-50/25 p-5 rounded-xl border border-rose-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">Workspace Cleanup</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Need to start fresh? Wipe current entries and seed default templates in one click.</p>
        </div>
        <button
          onClick={handleResetWorkspace}
          className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center shadow-sm hover:shadow transition justify-center cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          <span>Wipe & Seed Defaults</span>
        </button>
      </div>
    </div>
  );
};
