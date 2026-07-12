import React from "react";
import { useFinance } from "../context/FinanceContext";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  FileCheck2,
  AlertCircle,
  Sparkles,
  Upload,
  Wallet2,
  Coins
} from "lucide-react";
import { Account, Transaction } from "../types";

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    accounts,
    transactions,
    categories,
    categoryBudgets,
    currentBalance,
    totalIncome,
    totalExpenses,
    monthlySavings,
    receivables,
    payables
  } = useFinance();

  // Get current year-month (e.g. "2026-07")
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Sum monthly expenses per category
  const categorySpending: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.type === "Expense" && tx.date.startsWith(currentYearMonth)) {
      const amt = Number(tx.amount) || 0;
      categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amt;
    }
  });

  // Filter categories and map budgets
  const expenseCategories = categories.filter((c) => c.type === "Expense");
  const budgetedExpenses = expenseCategories
    .map((cat) => {
      const budget = categoryBudgets[cat.name] || 0;
      const spending = categorySpending[cat.name] || 0;
      const percentage = budget > 0 ? (spending / budget) * 100 : 0;
      return {
        name: cat.name,
        budget,
        spending,
        percentage
      };
    })
    .filter((b) => b.budget > 0);

  // Identify categories approaching (>= 80%) or exceeding (>= 100%) their budget limits
  const flaggedBudgets = budgetedExpenses.filter((b) => b.percentage >= 80);

  // Get last 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT"
    }).format(val).replace("BDT", "৳");
  };

  // Build data for the 7-day Income vs Expense chart
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

      const income = transactions
        .filter((tx) => tx.type === "Income" && tx.date === dateStr)
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

      const expense = transactions
        .filter((tx) => tx.type === "Expense" && tx.date === dateStr)
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

      data.push({ dateStr, label, income, expense });
    }
    return data;
  };

  const chartData = getLast7DaysData();
  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.income, d.expense)),
    1000 // default minimum scale to avoid division by zero
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column (Primary Statistics, Charts, & Ledger) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Overview Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Balance */}
          <div id="card-current-balance" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Net Current Balance</span>
              <div className="bg-blue-50 text-blue-800 p-1.5 rounded-lg border border-blue-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-sans text-slate-800 tracking-tight">
                {formatCurrency(currentBalance)}
              </h3>
              <p className="text-[10px] text-blue-600 mt-2 font-medium flex items-center">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 mr-1 flex-shrink-0" />
                Across {accounts.length} active ledgers
              </p>
            </div>
          </div>

          {/* Monthly Savings */}
          <div id="card-monthly-savings" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Savings This Month</span>
              <div className={`p-1.5 rounded-lg border ${monthlySavings >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className={`text-2xl font-bold font-sans tracking-tight ${monthlySavings >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(monthlySavings)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Current calendar month net savings
              </p>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div id="card-receivables-payables" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Outstanding Balance</span>
              <div className="bg-slate-50 text-slate-600 p-1.5 rounded-lg border border-slate-100">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Receivable</span>
                <span className="text-sm font-bold font-sans text-emerald-600">{formatCurrency(receivables)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Payable</span>
                <span className="text-sm font-bold font-sans text-rose-600">{formatCurrency(payables)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Alerts & Progress Panel */}
        <div id="panel-budget-alerts" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-rose-500" />
                Monthly Budgets & Spend Limits
              </h3>
              <p className="text-[11px] text-slate-400">Comparing current month expenses against your set limits</p>
            </div>
            <button
              onClick={() => onNavigate("categories")}
              className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Configure Budgets
            </button>
          </div>

          {flaggedBudgets.length > 0 && (
            <div className="bg-amber-50/75 border border-amber-200 p-3.5 rounded-lg space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Budget Warning Triggered
              </span>
              <div className="space-y-1.5">
                {flaggedBudgets.map((fb) => (
                  <p key={fb.name} className="text-xs text-amber-900 font-medium leading-relaxed">
                    Category <span className="font-bold">{fb.name}</span> has reached{" "}
                    <span className="font-bold font-mono">{Math.round(fb.percentage)}%</span> of its budget limit (
                    <span className="font-bold">{formatCurrency(fb.spending)}</span> spent of{" "}
                    <span className="font-bold">{formatCurrency(fb.budget)}</span> budget limit).
                  </p>
                ))}
              </div>
            </div>
          )}

          {budgetedExpenses.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400 italic">No category budget limits have been configured yet.</p>
              <button
                onClick={() => onNavigate("categories")}
                className="mt-2.5 inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Set Category Budgets Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetedExpenses.map((b) => {
                let statusColor = "bg-emerald-500";
                let statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
                let statusText = "On Track";

                if (b.percentage >= 100) {
                  statusColor = "bg-rose-500";
                  statusBg = "bg-rose-50 border border-rose-200 text-rose-700";
                  statusText = "Exceeded";
                } else if (b.percentage >= 80) {
                  statusColor = "bg-amber-500 animate-pulse";
                  statusBg = "bg-amber-50 border border-amber-200 text-amber-700";
                  statusText = "Approaching";
                }

                return (
                  <div key={b.name} className="p-3 border border-slate-100 rounded-lg bg-slate-50/30 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 truncate mr-2" title={b.name}>{b.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${statusBg}`}>
                        {statusText}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Bar container */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${statusColor} transition-all duration-300`}
                          style={{ width: `${Math.min(b.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 font-mono">
                        <span>{formatCurrency(b.spending)}</span>
                        <span>{formatCurrency(b.budget)} limit ({Math.round(b.percentage)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Income & Expense Breakdown Mini Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div id="mini-card-income" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">All-Time Total Income</span>
              <h4 className="text-lg font-bold font-sans text-emerald-600 mt-0.5">{formatCurrency(totalIncome)}</h4>
            </div>
          </div>

          <div id="mini-card-expense" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">All-Time Total Expense</span>
              <h4 className="text-lg font-bold font-sans text-rose-600 mt-0.5">{formatCurrency(totalExpenses)}</h4>
            </div>
          </div>
        </div>

        {/* Income vs Expense Chart */}
        <div id="panel-chart-7day" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">
                Activity History
              </h3>
              <p className="text-[11px] text-slate-400">Income vs Expense comparison for the last 7 days</p>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-semibold tracking-wider uppercase">
              <span className="flex items-center">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500 mr-1.5 inline-block"></span>
                <span className="text-slate-500">Income</span>
              </span>
              <span className="flex items-center">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-400 mr-1.5 inline-block"></span>
                <span className="text-slate-500">Expense</span>
              </span>
            </div>
          </div>

          {/* Interactive Responsive SVG Bar Chart */}
          <div className="flex-1 min-h-[200px] flex items-end justify-between px-2 pt-4 border-b border-slate-100 relative">
            {chartData.map((day, idx) => {
              // Calculate percent heights
              const incPercent = (day.income / maxVal) * 100;
              const expPercent = (day.expense / maxVal) * 100;

              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div className="w-full flex justify-center items-end space-x-1 h-[140px] relative">
                    {/* Tooltip Overlay */}
                    <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap shadow-lg">
                      <div className="font-semibold text-gray-300">{day.label}</div>
                      <div className="text-emerald-400">Inc: {formatCurrency(day.income)}</div>
                      <div className="text-rose-400">Exp: {formatCurrency(day.expense)}</div>
                    </div>

                    {/* Income Bar */}
                    <div
                      style={{ height: `${Math.max(incPercent, 2)}%` }}
                      className={`w-3 rounded-t-sm transition-all duration-300 ${
                        day.income > 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-100"
                      }`}
                    ></div>

                    {/* Expense Bar */}
                    <div
                      style={{ height: `${Math.max(expPercent, 2)}%` }}
                      className={`w-3 rounded-t-sm transition-all duration-300 ${
                        day.expense > 0 ? "bg-rose-400 hover:bg-rose-500" : "bg-slate-100"
                      }`}
                    ></div>
                  </div>
                  {/* Day Label */}
                  <span className="text-[10px] font-semibold text-slate-400 mt-2 text-center truncate w-full px-0.5">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions Panel */}
        <div id="panel-recent-transactions" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">
                Recent Ledger
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Latest active financial entries</p>
            </div>
            <button
              onClick={() => onNavigate("reports")}
              className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 flex items-center transition-colors"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {recentTransactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                <FileCheck2 className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-semibold text-slate-500">No Transactions Found</span>
                <p className="text-[10px] text-slate-400 mt-0.5 px-4">
                  Add entries manually or upload file screenshot to get started.
                </p>
                <button
                  onClick={() => onNavigate("add")}
                  className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add First Entry</span>
                </button>
              </div>
            ) : (
              recentTransactions.map((tx) => {
                // Find account name
                const accountObj = accounts.find((a) => a.id === tx.account);
                const accountLabel = accountObj ? accountObj.name : "Unknown Account";

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-blue-100 bg-slate-50/30 hover:bg-white transition-all flex items-center justify-between"
                  >
                    <div className="flex flex-col min-w-0 flex-1 pr-3">
                      <span className="text-xs font-semibold text-slate-800 truncate font-sans">
                        {tx.description}
                      </span>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1 font-sans">
                        <span className="font-semibold">{tx.date}</span>
                        <span>•</span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold text-[9px] uppercase tracking-wider">
                          {accountLabel}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500 font-medium">{tx.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span
                        className={`text-xs font-bold font-sans ${
                          tx.type === "Income"
                            ? "text-emerald-600"
                            : tx.type === "Expense"
                            ? "text-rose-600"
                            : "text-blue-600"
                        }`}
                      >
                        {tx.type === "Income" ? "+" : tx.type === "Expense" ? "-" : "⇄"}{" "}
                        {formatCurrency(tx.amount)}
                      </span>
                      {(tx.isReceivable || tx.isPayable) && (
                        <span
                          className={`text-[9px] px-1.5 rounded-full border mt-1 flex items-center font-bold uppercase tracking-wider ${
                            tx.isCleared
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          }`}
                        >
                          {tx.isCleared ? "Cleared" : tx.isReceivable ? "Owed" : "Due"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column (AI scanner tool trigger, Accounts lists) */}
      <div className="lg:col-span-4 space-y-6">
        {/* AI Scan Tool Widget */}
        <div className="bg-blue-900 rounded-xl p-5 text-white shadow-lg border border-blue-800 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <h4 className="font-bold flex items-center gap-2 mb-2 text-sm">
              <Sparkles className="h-4 w-4 text-amber-400" />
              AI Smart Extraction
            </h4>
            <p className="text-xs text-blue-200 mb-4">Upload bank statement, PDF, or screenshot to auto-fill details.</p>
            
            <div 
              onClick={() => {
                localStorage.setItem("triggerAIScan", "true");
                onNavigate("add");
              }}
              className="border-2 border-dashed border-blue-400/50 hover:border-blue-300 rounded-lg p-5 flex flex-col items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors cursor-pointer group"
            >
              <Upload className="w-8 h-8 text-blue-300 mb-2 group-hover:text-white transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 group-hover:text-white transition-colors">Click to scan documents</span>
            </div>
            <p className="text-[9px] italic text-blue-400 mt-2.5 leading-relaxed">AI extraction matches categories and payment references instantly.</p>
          </div>
          {/* Decorative circle background */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-700/30 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Accounts list card */}
        <div className="bg-white flex-1 rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Accounts Directory</h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Live computed ledger net values</p>
            </div>
            <button
              onClick={() => onNavigate("accounts")}
              className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800"
            >
              Configure
            </button>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {accounts.map((acc) => (
              <div 
                key={acc.id}
                onClick={() => onNavigate("accounting")} 
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-white rounded border border-slate-100 text-slate-600 group-hover:text-blue-600 transition-colors">
                    <Wallet2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-700 text-xs truncate block">{acc.name}</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">{acc.type}</span>
                  </div>
                </div>
                <span className="font-bold text-slate-800 text-xs font-sans">
                  {formatCurrency((acc as any).currentBalance ?? acc.initialBalance)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Savings Goals Target Card */}
        {accounts.some((acc) => acc.targetGoal && acc.targetGoal > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col hover:shadow-md transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 font-sans">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  Savings Goals Progress
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Tracking targets set for specific accounts</p>
              </div>
              <button
                onClick={() => onNavigate("accounts")}
                className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {accounts
                .filter((acc) => acc.targetGoal && acc.targetGoal > 0)
                .map((acc) => {
                  const currentBal = (acc as any).currentBalance ?? acc.initialBalance;
                  const target = acc.targetGoal!;
                  const percent = Math.min(100, Math.round((currentBal / target) * 100));
                  const isCompleted = currentBal >= target;

                  return (
                    <div key={acc.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="font-bold text-slate-700 truncate" title={acc.name}>{acc.name}</span>
                        <span className={`font-mono text-[10px] font-bold ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {percent}%
                        </span>
                      </div>
                      
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                        <span>Bal: {formatCurrency(currentBal)}</span>
                        <span>Target: {formatCurrency(target)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
