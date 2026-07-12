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
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Percent,
  TrendingUpIcon
} from "lucide-react";
import { Transaction } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

export const ReportsView: React.FC = () => {
  const {
    transactions,
    accounts,
    deleteTransaction,
    clearAllData,
    seedDefaults
  } = useFinance();

  // State for Recharts trend charts
  const [trendType, setTrendType] = useState<"line" | "area" | "bar">("line");

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT"
    }).format(val).replace("BDT", "৳");
  };

  // Generate last 12 months (including current month)
  const getLast12MonthsData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      // Create a date in that month
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`; // "2026-07"
      const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }); // "Jul 26"
      
      const income = transactions
        .filter((tx) => tx.type === "Income" && tx.date.startsWith(monthKey))
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        
      const expense = transactions
        .filter((tx) => tx.type === "Expense" && tx.date.startsWith(monthKey))
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        
      const net = income - expense;
      
      data.push({
        monthKey,
        label: monthLabel,
        Income: income,
        Expenses: expense,
        Net: net
      });
    }
    
    return data;
  };

  const trendData = getLast12MonthsData();

  // Statistics over the last 12 months
  const total12MonthIncome = trendData.reduce((sum, d) => sum + d.Income, 0);
  const total12MonthExpense = trendData.reduce((sum, d) => sum + d.Expenses, 0);
  const avgMonthlyIncome = total12MonthIncome / 12;
  const avgMonthlyExpense = total12MonthExpense / 12;
  const savingsRate = total12MonthIncome > 0 ? ((total12MonthIncome - total12MonthExpense) / total12MonthIncome) * 100 : 0;

  // Custom styled Tooltip matching our dashboard
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-[11px] font-sans space-y-1.5">
          <p className="font-bold text-slate-300 uppercase tracking-wider mb-1">{label}</p>
          {payload.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 font-semibold">{item.name}:</span>
              </span>
              <span className="font-mono font-bold" style={{ color: item.color }}>
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "daily" | "monthly" | "yearly" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // e.g., "2026-07"
  const [selectedYear, setSelectedYear] = useState("2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

      {/* Interactive 12-Month Cash Flow Trends (Recharts) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              12-Month Interactive Cash Flow Trends
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Multi-series evaluation of historical income, expense profiles, and net margins</p>
          </div>
          
          {/* Chart selector tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setTrendType("line")}
              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all cursor-pointer ${
                trendType === "line"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Multi-Line
            </button>
            <button
              onClick={() => setTrendType("area")}
              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all cursor-pointer ${
                trendType === "area"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Area Fill
            </button>
            <button
              onClick={() => setTrendType("bar")}
              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all cursor-pointer ${
                trendType === "bar"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Net Flow
            </button>
          </div>
        </div>

        {/* Analytic micro-cards inside reports */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-1">
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avg. Monthly Income</span>
            <span className="text-sm font-bold text-emerald-600 font-mono mt-1">{formatCurrency(avgMonthlyIncome)}</span>
          </div>
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avg. Monthly Expense</span>
            <span className="text-sm font-bold text-rose-600 font-mono mt-1">{formatCurrency(avgMonthlyExpense)}</span>
          </div>
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">12M Average Savings</span>
            <span className={`text-sm font-bold font-mono mt-1 ${avgMonthlyIncome - avgMonthlyExpense >= 0 ? "text-blue-600" : "text-rose-600"}`}>
              {formatCurrency(avgMonthlyIncome - avgMonthlyExpense)}
            </span>
          </div>
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/50 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average Savings Rate</span>
            <span className="text-sm font-bold text-slate-700 font-mono mt-1 flex items-center">
              <Percent className="h-3.5 w-3.5 mr-0.5 text-blue-500" />
              {Math.max(0, Math.round(savingsRate))}%
            </span>
          </div>
        </div>

        {/* Trend line Chart canvas container */}
        <div className="w-full h-[260px] pt-4 relative">
          {total12MonthIncome === 0 && total12MonthExpense === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-slate-50/30 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 italic">No ledger entries recorded over the last 12 months.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {trendType === "line" ? (
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `৳${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                    tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Income"
                    name="Monthly Income"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Expenses"
                    name="Monthly Expenses"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net"
                    name="Net Savings"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              ) : trendType === "area" ? (
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `৳${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                    tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    name="Monthly Income"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="Expenses"
                    name="Monthly Expenses"
                    stroke="#f43f5e"
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              ) : (
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `৳${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                    tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="Net"
                    name="Net Cash Flow"
                    radius={[4, 4, 0, 0]}
                  >
                    {trendData.map((entry, index) => (
                      <rect
                        key={`rect-${index}`}
                        fill={entry.Net >= 0 ? "#10b981" : "#f43f5e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
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
