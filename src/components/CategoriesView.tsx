import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { Plus, Trash2, Tag, TrendingUp, TrendingDown, Edit2, Check, X, Coins } from "lucide-react";

export const CategoriesView: React.FC = () => {
  const { categories, addCategory, deleteCategory, categoryBudgets, updateCategoryBudget, transactions } = useFinance();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"Income" | "Expense">("Expense");

  // Local state to manage which category budgets are currently being edited
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempBudgetValue, setTempBudgetValue] = useState<string>("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addCategory(name.trim(), type);
      setName("");
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add category");
    }
  };

  const handleDelete = async (id: string, isDefault?: boolean) => {
    if (isDefault) {
      alert("Standard pre-seeded categories cannot be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      await deleteCategory(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete category");
    }
  };

  const startEditingBudget = (categoryName: string) => {
    setEditingCategory(categoryName);
    setTempBudgetValue((categoryBudgets[categoryName] || "").toString());
  };

  const handleSaveBudget = async (categoryName: string) => {
    const num = Number(tempBudgetValue);
    if (isNaN(num) || num < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }

    try {
      await updateCategoryBudget(categoryName, num);
      setEditingCategory(null);
    } catch (err) {
      console.error("Failed to update budget:", err);
      alert("Failed to update budget");
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "Income");
  const expenseCategories = categories.filter((c) => c.type === "Expense");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">
            Manage Categories & Budgets
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Classify your income sources, and set monthly category budgets to monitor visual alerts on your dashboard.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            id="btn-trigger-add-category"
            className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Add Drawer Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          id="add-category-form"
          className="bg-slate-50 p-5 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-4 items-end shadow-inner"
        >
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category Name</label>
            <input
              type="text"
              placeholder="e.g. Subscriptions, Pet Care, Office tea"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "Income" | "Expense")}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none w-full sm:w-40 transition-all"
            >
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="submit"
              id="btn-save-category"
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 px-5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Dual Column Layout (Income vs Expense Categories) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Column */}
        <div id="panel-income-categories" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
              Income Streams ({incomeCategories.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {incomeCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/25 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <Tag className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 truncate">{cat.name}</span>
                  {cat.isDefault && (
                    <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Core
                    </span>
                  )}
                </div>
                {!cat.isDefault && (
                  <button
                    onClick={() => handleDelete(cat.id, cat.isDefault)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expense Column with Budget Controls */}
        <div id="panel-expense-categories" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
              <TrendingDown className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
              Expense Categories & Monthly Budgets ({expenseCategories.length})
            </h3>
          </div>

          <div className="space-y-2">
            {expenseCategories.map((cat) => {
              const currentBudget = categoryBudgets[cat.name] || 0;
              const isEditingThis = editingCategory === cat.name;

              return (
                <div
                  key={cat.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/25 hover:border-rose-300 transition-colors gap-3"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Tag className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{cat.name}</span>
                    {cat.isDefault && (
                      <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Core
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Visual Progress Indicator */}
                    {currentBudget > 0 && !isEditingThis && (
                      <div className="flex flex-col w-32 justify-center mr-2">
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          {(() => {
                            const now = new Date();
                            const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                            
                            const spending = transactions
                              .filter(tx => tx.type === "Expense" && tx.category === cat.name && tx.date.startsWith(currentYearMonth))
                              .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
                            
                            const percentage = Math.min((spending / currentBudget) * 100, 100);
                            let color = "bg-emerald-500";
                            if (percentage >= 100) color = "bg-rose-500";
                            else if (percentage >= 80) color = "bg-amber-500";
                            
                            return (
                              <div
                                className={`h-full ${color} transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Budget UI */}
                    <div className="flex items-center justify-end">
                      {isEditingThis ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">৳</span>
                          <input
                            type="number"
                            value={tempBudgetValue}
                            onChange={(e) => setTempBudgetValue(e.target.value)}
                            placeholder="Limit"
                            className="w-20 px-2 py-0.5 text-xs border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveBudget(cat.name)}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                            title="Save Budget"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 bg-slate-100/50 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/50 transition-all">
                          <Coins className="h-3 w-3 text-slate-400" />
                          <span className="text-xs font-mono font-medium text-slate-600">
                            {currentBudget > 0 ? `Budget: ৳${currentBudget.toLocaleString()}` : "No budget limit"}
                          </span>
                          <button
                            onClick={() => startEditingBudget(cat.name)}
                            className="text-slate-400 hover:text-blue-600 ml-1 cursor-pointer"
                            title="Edit Budget Limit"
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDelete(cat.id, cat.isDefault)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
