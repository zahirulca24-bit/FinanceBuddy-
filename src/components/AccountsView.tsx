import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Building,
  Smartphone,
  Wallet2,
  BadgePercent,
  TrendingDown,
  Activity
} from "lucide-react";
import { ACCOUNT_TYPES } from "../lib/defaults";
import { AccountType } from "../types";

export const AccountsView: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();

  // Create Mode States
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("Cash");
  const [newInitialBalance, setNewInitialBalance] = useState("");
  const [newTargetGoal, setNewTargetGoal] = useState("");

  // Edit Mode States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("Cash");
  const [editInitialBalance, setEditInitialBalance] = useState("");
  const [editTargetGoal, setEditTargetGoal] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await addAccount(newName, newType, Number(newInitialBalance) || 0, newTargetGoal ? Number(newTargetGoal) : undefined);
      setNewName("");
      setNewType("Cash");
      setNewInitialBalance("");
      setNewTargetGoal("");
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add account");
    }
  };

  const handleStartEdit = (acc: any) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type);
    setEditInitialBalance(String(acc.initialBalance));
    setEditTargetGoal(acc.targetGoal ? String(acc.targetGoal) : "");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;

    try {
      await updateAccount(id, editName, editType, Number(editInitialBalance) || 0, editTargetGoal ? Number(editTargetGoal) : undefined);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update account");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this account? This will affect calculated balances for transactions tied to it.")) {
      return;
    }

    try {
      await deleteAccount(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete account");
    }
  };

  // Icon mapping based on account type
  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case "Bank account":
        return <Building className="h-5 w-5 text-blue-600" />;
      case "bKash":
      case "Nagad":
      case "Rocket":
        return <Smartphone className="h-5 w-5 text-pink-600" />;
      case "Credit card":
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case "Loan account":
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case "Investment account":
        return <BadgePercent className="h-5 w-5 text-green-600" />;
      default:
        return <Wallet2 className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Title & Add Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">
            Configure Accounts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage all your financial wallets, bank vaults, loans, and mobile cash repositories</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            id="btn-trigger-add-account"
            className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        )}
      </div>

      {/* Add New Account Drawer */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          id="add-account-form"
          className="bg-slate-50 p-5 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-inner"
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Name</label>
            <input
              type="text"
              placeholder="e.g. Dutch Bangla Bank, bKash Personal"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as AccountType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all"
              required
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opening Balance (৳)</label>
            <input
              type="number"
              placeholder="0.00"
              value={newInitialBalance}
              onChange={(e) => setNewInitialBalance(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono font-bold focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Savings Goal (৳)</label>
            <input
              type="number"
              placeholder="Optional"
              value={newTargetGoal}
              onChange={(e) => setNewTargetGoal(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono font-bold focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              id="btn-save-new-account"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
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

      {/* Accounts Cards List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isEditing = editingId === acc.id;

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-xl border bg-white transition shadow-sm hover:shadow-md flex flex-col justify-between ${
                isEditing ? "border-blue-400 bg-blue-50/5" : "border-slate-200"
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5 focus:outline-none font-semibold focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as AccountType)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-0.5 focus:outline-none font-semibold focus:border-blue-500"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Balance (৳)</label>
                    <input
                      type="number"
                      value={editInitialBalance}
                      onChange={(e) => setEditInitialBalance(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white mt-0.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Savings Goal (৳)</label>
                    <input
                      type="number"
                      placeholder="Optional"
                      value={editTargetGoal}
                      onChange={(e) => setEditTargetGoal(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white mt-0.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleSaveEdit(acc.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Apply</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg flex items-center justify-center space-x-1 cursor-pointer border border-slate-200"
                    >
                      <X className="h-3.5 w-3.5 text-rose-500" />
                      <span>Discard</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* View Details Mode */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-150">
                          {getAccountIcon(acc.type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 font-sans tracking-tight">
                            {acc.name}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                            {acc.type}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Menu Buttons */}
                      <div className="flex items-center space-x-1 opacity-50 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(acc)}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Account"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-1 text-slate-500 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
 
                    {/* Calculated Balance display */}
                    <div className="mt-5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Calculated Net Value</span>
                      <h3 className="text-2xl font-bold font-sans text-slate-800 tracking-tight mt-0.5">
                        ৳{new Intl.NumberFormat("en-US").format((acc as any).currentBalance ?? acc.initialBalance)}
                      </h3>
                      
                      {acc.targetGoal && acc.targetGoal > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            <span>Goal Progress</span>
                            <span className={(((acc as any).currentBalance ?? acc.initialBalance) >= acc.targetGoal) ? 'text-emerald-600' : 'text-blue-600'}>
                              {Math.min(100, Math.round((((acc as any).currentBalance ?? acc.initialBalance) / acc.targetGoal) * 100))}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${(((acc as any).currentBalance ?? acc.initialBalance) >= acc.targetGoal) ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                              style={{ width: `${Math.min(100, Math.max(0, (((acc as any).currentBalance ?? acc.initialBalance) / acc.targetGoal) * 100))}%` }} 
                            />
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono text-right mt-1.5 font-bold uppercase tracking-wider">
                            Target: ৳{new Intl.NumberFormat("en-US").format(acc.targetGoal)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
 
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono">
                    <span>Opening: ৳{acc.initialBalance}</span>
                    <span className="flex items-center text-blue-600">
                      <Activity className="h-3 w-3 mr-1" />
                      Active Ledger
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
