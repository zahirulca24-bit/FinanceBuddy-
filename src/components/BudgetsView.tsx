import React, { useState, useMemo } from "react";
import { useFinance } from "../context/FinanceContext";
import { motion } from "motion/react";
import { 
  TrendingDown, 
  Coins, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Sparkles, 
  Info,
  Sliders,
  DollarSign
} from "lucide-react";

export const BudgetsView: React.FC = () => {
  const { 
    categories, 
    categoryBudgets, 
    updateCategoryBudget, 
    transactions 
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "budgeted" | "unbudgeted" | "warning">("all");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempBudgetValue, setTempBudgetValue] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Date constants for current month
  const now = new Date();
  const currentMonthName = now.toLocaleString("default", { month: "long" });
  const currentYear = now.getFullYear();
  const currentYearMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Filter actual transactions for current month's expenses
  const currentMonthExpenses = useMemo(() => {
    return transactions.filter(tx => 
      tx.type === "Expense" && 
      tx.date.startsWith(currentYearMonth)
    );
  }, [transactions, currentYearMonth]);

  // Aggregate current month spending by category
  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthExpenses.forEach(tx => {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    });
    return map;
  }, [currentMonthExpenses]);

  // Retrieve expense categories only
  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === "Expense");
  }, [categories]);

  // Calculate high-level metrics
  const stats = useMemo(() => {
    let totalBudgeted = 0;
    let totalSpentInBudgeted = 0;
    let warningCategoriesCount = 0;
    let exceededCategoriesCount = 0;

    expenseCategories.forEach(cat => {
      const budget = categoryBudgets[cat.name] || 0;
      const spent = spendingByCategory[cat.name] || 0;

      if (budget > 0) {
        totalBudgeted += budget;
        totalSpentInBudgeted += spent;

        const ratio = spent / budget;
        if (ratio >= 1.0) {
          exceededCategoriesCount++;
        } else if (ratio >= 0.8) {
          warningCategoriesCount++;
        }
      }
    });

    const totalOverallSpent = currentMonthExpenses.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalBudgeted,
      totalSpentInBudgeted,
      totalOverallSpent,
      remainingBudget: totalBudgeted - totalSpentInBudgeted,
      warningCategoriesCount,
      exceededCategoriesCount,
      overallUtilization: totalBudgeted > 0 ? (totalSpentInBudgeted / totalBudgeted) * 100 : 0
    };
  }, [expenseCategories, categoryBudgets, spendingByCategory, currentMonthExpenses]);

  // Handle saving a budget limit
  const handleSaveBudget = async (categoryName: string, value: string) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }

    try {
      await updateCategoryBudget(categoryName, num);
      setEditingCategory(null);
    } catch (err) {
      console.error("Failed to update budget:", err);
      alert("An error occurred while saving the budget limit.");
    }
  };

  // Toggle transaction expansion for a category
  const toggleExpanded = (catName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  // Quick action to increment/decrement budget
  const handleQuickAdjust = async (categoryName: string, amount: number) => {
    const currentLimit = categoryBudgets[categoryName] || 0;
    const newLimit = Math.max(0, currentLimit + amount);
    try {
      await updateCategoryBudget(categoryName, newLimit);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter categories based on search and selected filter type
  const filteredCategories = useMemo(() => {
    return expenseCategories.filter(cat => {
      // Search matches
      const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const budget = categoryBudgets[cat.name] || 0;
      const spent = spendingByCategory[cat.name] || 0;

      // Filter matches
      if (filterType === "budgeted") return budget > 0;
      if (filterType === "unbudgeted") return budget === 0;
      if (filterType === "warning") {
        return budget > 0 && spent >= budget * 0.8;
      }
      return true;
    });
  }, [expenseCategories, searchQuery, filterType, categoryBudgets, spendingByCategory]);

  // Compute dynamic smart insights based on actual spending
  const insights = useMemo(() => {
    const items: { text: string; type: "info" | "warning" | "success" }[] = [];

    // Overall status insight
    if (stats.totalBudgeted === 0) {
      items.push({
        text: "You haven't set any monthly category limits yet. Define limits below to gain full command of your monthly cash flows.",
        type: "info"
      });
    } else {
      if (stats.overallUtilization >= 100) {
        items.push({
          text: `Critical Alert: You have exceeded your overall budget limit of ৳${stats.totalBudgeted.toLocaleString()} by ৳${Math.abs(stats.remainingBudget).toLocaleString()}!`,
          type: "warning"
        });
      } else if (stats.overallUtilization >= 80) {
        items.push({
          text: `Overall utilization is high (${stats.overallUtilization.toFixed(1)}%). You have ৳${stats.remainingBudget.toLocaleString()} remaining in your total category budgets.`,
          type: "warning"
        });
      } else {
        items.push({
          text: `Excellent job! Overall utilization is in the healthy zone at ${stats.overallUtilization.toFixed(1)}% of your budgeted limits.`,
          type: "success"
        });
      }
    }

    // Specific category insights
    expenseCategories.forEach(cat => {
      const budget = categoryBudgets[cat.name] || 0;
      const spent = spendingByCategory[cat.name] || 0;

      if (budget > 0) {
        const ratio = spent / budget;
        if (ratio >= 1.0) {
          items.push({
            text: `Category "${cat.name}" is over budget! Spent: ৳${spent.toLocaleString()} vs Limit: ৳${budget.toLocaleString()}.`,
            type: "warning"
          });
        } else if (ratio >= 0.85) {
          items.push({
            text: `Category "${cat.name}" is getting close to its limit (${(ratio * 100).toFixed(0)}% used).`,
            type: "info"
          });
        }
      }
    });

    return items.slice(0, 4); // Limit to top 4 insights
  }, [stats, categoryBudgets, spendingByCategory, expenseCategories]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Title Header */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">
          Monthly Spend Controls & Budgets
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Establish monthly spending boundaries per category for <span className="font-semibold text-slate-600 font-mono">{currentMonthName} {currentYear}</span>. Monitor live transactions, track limits, and secure financial disciplines.
        </p>
      </div>

      {/* Hero Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Budget Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              Total Budget Limit
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ৳{stats.totalBudgeted.toLocaleString()}
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Aggregated spending caps
            </p>
          </div>
        </div>

        {/* Total Spent in Budgeted Categories Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              Spent (Budgeted categories)
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ৳{stats.totalSpentInBudgeted.toLocaleString()}
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Actual spending in limit categories
            </p>
          </div>
        </div>

        {/* Remaining Overall Budget Card */}
        <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              Remaining Budget
            </span>
            <div className={`p-1.5 rounded-lg ${stats.remainingBudget >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              {stats.remainingBudget >= 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-bold font-mono ${stats.remainingBudget >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {stats.remainingBudget < 0 ? "-" : ""}৳{Math.abs(stats.remainingBudget).toLocaleString()}
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              {stats.remainingBudget >= 0 ? "Surplus remaining to spend" : "Deficit exceeded"}
            </p>
          </div>
        </div>

        {/* Budget Alerts Count Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              Budget Alert Categories
            </span>
            <div className={`p-1.5 rounded-lg ${stats.exceededCategoriesCount > 0 ? "bg-red-50 text-red-600 animate-pulse" : stats.warningCategoriesCount > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {stats.exceededCategoriesCount + stats.warningCategoriesCount}
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              <span className="text-rose-500 font-bold">{stats.exceededCategoriesCount} exceeded</span> • <span className="text-amber-500 font-bold">{stats.warningCategoriesCount} warning</span>
            </p>
          </div>
        </div>
      </div>

      {/* Overall Utilization Bar */}
      {stats.totalBudgeted > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Overall Budget Utilization Progress</span>
            <span className="text-xs font-mono font-bold text-slate-700">{stats.overallUtilization.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
            <div 
              className={`h-full transition-all duration-500 ${
                stats.overallUtilization >= 100 
                  ? "bg-rose-500" 
                  : stats.overallUtilization >= 80 
                  ? "bg-amber-500" 
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(stats.overallUtilization, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Smart Insights Section */}
      {insights.length > 0 && (
        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-blue-800">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-sans">Smart Financial Ledger Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, idx) => (
              <div 
                key={idx} 
                className={`flex items-start space-x-2 px-3 py-2.5 rounded-lg text-xs font-sans border ${
                  ins.type === "warning" 
                    ? "bg-rose-50 text-rose-800 border-rose-100" 
                    : ins.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                    : "bg-white text-slate-700 border-slate-100 shadow-sm"
                }`}
              >
                <div className="mt-0.5">
                  {ins.type === "warning" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                  ) : ins.type === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expense category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Tab-styled Filters */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
          {(["all", "budgeted", "unbudgeted", "warning"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterType === type 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {type === "all" ? "All Categories" : type === "budgeted" ? "Budgeted Only" : type === "unbudgeted" ? "Unbudgeted" : "Alerts"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full bg-white py-12 px-6 rounded-xl border border-slate-200 shadow-sm text-center">
            <Sliders className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Categories Found</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              No expense categories match the current filter or search term. Adjust your inputs or clear the search.
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const currentBudget = categoryBudgets[cat.name] || 0;
            const spent = spendingByCategory[cat.name] || 0;
            const ratio = currentBudget > 0 ? spent / currentBudget : 0;
            const percentage = Math.min(ratio * 100, 100);
            const isEditing = editingCategory === cat.name;

            // Transactions belonging to this category in current month
            const catTransactions = currentMonthExpenses.filter(tx => tx.category === cat.name);
            const isExpanded = !!expandedCategories[cat.name];

            // Determine health state colors
            let barColor = "bg-emerald-500";
            let textColor = "text-emerald-700";
            let bgLight = "bg-emerald-50/40";
            let borderHover = "hover:border-emerald-200";

            if (currentBudget > 0) {
              if (ratio >= 1.0) {
                barColor = "bg-rose-500";
                textColor = "text-rose-700";
                bgLight = "bg-rose-50/40";
                borderHover = "hover:border-rose-200";
              } else if (ratio >= 0.8) {
                barColor = "bg-amber-500";
                textColor = "text-amber-700";
                bgLight = "bg-amber-50/40";
                borderHover = "hover:border-amber-200";
              }
            } else {
              barColor = "bg-slate-300";
              textColor = "text-slate-500";
              bgLight = "bg-slate-50/40";
              borderHover = "hover:border-slate-300";
            }

            return (
              <motion.div
                key={cat.id}
                layout
                className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${borderHover}`}
              >
                {/* Card Header & Budget Amount */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">{cat.name}</span>
                        {cat.isDefault && (
                          <span className="text-[7px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                            Core
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block uppercase tracking-wider">
                        Expense Stream
                      </span>
                    </div>

                    {/* Budget Limit Status or Input */}
                    <div className="shrink-0 text-right">
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-mono text-slate-400">৳</span>
                          <input
                            type="number"
                            value={tempBudgetValue}
                            onChange={(e) => setTempBudgetValue(e.target.value)}
                            placeholder="Limit"
                            className="w-20 px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none font-mono"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveBudget(cat.name, tempBudgetValue);
                              if (e.key === "Escape") setEditingCategory(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveBudget(cat.name, tempBudgetValue)}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                            title="Save Limit"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 rounded cursor-pointer"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] font-mono text-slate-500">LIMIT:</span>
                          <span className="text-xs font-bold font-mono text-slate-700">
                            {currentBudget > 0 ? `৳${currentBudget.toLocaleString()}` : "৳0 (None)"}
                          </span>
                          <button
                            onClick={() => {
                              setEditingCategory(cat.name);
                              setTempBudgetValue(currentBudget > 0 ? currentBudget.toString() : "");
                            }}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Edit Budget Boundary"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spending & Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Spent this month</span>
                        <span className="text-sm font-bold font-mono text-slate-800">৳{spent.toLocaleString()}</span>
                      </div>
                      
                      {currentBudget > 0 && (
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Remaining</span>
                          <span className={`text-xs font-bold font-mono block ${currentBudget - spent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {currentBudget - spent < 0 ? "-" : ""}৳{Math.abs(currentBudget - spent).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress slider line */}
                    {currentBudget > 0 ? (
                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full ${barColor} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                          <span className={textColor}>{percentage.toFixed(0)}% used</span>
                          <span className="text-slate-400">Target 100%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1 bg-slate-50 rounded border border-dashed border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans">No spending cap defined</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Quick-adjust limits buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Quick bounds:</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleQuickAdjust(cat.name, -500)}
                        className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[9px] font-mono font-semibold text-slate-500 cursor-pointer"
                        title="Decrease limit by ৳500"
                      >
                        -500
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(cat.name, 500)}
                        className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[9px] font-mono font-semibold text-slate-600 cursor-pointer"
                        title="Increase limit by ৳500"
                      >
                        +500
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(cat.name, 1000)}
                        className="px-1.5 py-0.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded text-[9px] font-mono font-bold text-blue-600 cursor-pointer"
                        title="Increase limit by ৳1,000"
                      >
                        +1K
                      </button>
                      {currentBudget > 0 && (
                        <button
                          onClick={() => updateCategoryBudget(cat.name, 0)}
                          className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded text-[9px] font-mono font-bold text-rose-500 cursor-pointer"
                          title="Remove spending cap"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show Transaction Accordion */}
                <div className="border-t border-slate-100 bg-slate-50/40">
                  <button
                    onClick={() => toggleExpanded(cat.name)}
                    className="w-full px-5 py-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span>Transactions ({catTransactions.length})</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 border-t border-slate-100/50 pt-2 bg-white">
                      {catTransactions.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic font-sans py-2 text-center">
                          No transactions recorded under this category in {currentMonthName}.
                        </p>
                      ) : (
                        catTransactions.map((tx) => (
                          <div 
                            key={tx.id} 
                            className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-[11px] font-sans"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-700 truncate">{tx.description || "Unspecified expense"}</p>
                              <span className="text-[9px] text-slate-400 font-mono">{tx.date}</span>
                            </div>
                            <span className="font-bold font-mono text-slate-700 shrink-0">৳{tx.amount.toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
