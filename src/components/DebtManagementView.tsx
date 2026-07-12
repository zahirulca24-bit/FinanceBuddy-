import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { CreditCard, Landmark, Plus, Percent, Calendar, TrendingDown, Target, Save, X, Edit2, AlertCircle } from "lucide-react";
import { DebtDetail } from "../types";

export const DebtManagementView: React.FC = () => {
  const { accounts, debtDetails, updateDebtDetail } = useFinance();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [interestRate, setInterestRate] = useState<string>("");
  const [minimumPayment, setMinimumPayment] = useState<string>("");
  const [creditLimit, setCreditLimit] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const debtAccounts = accounts.filter(a => a.type === "Credit card" || a.type === "Loan account");

  const handleEdit = (accId: string, currentDetail: DebtDetail | undefined) => {
    setEditingId(accId);
    setInterestRate(currentDetail?.interestRate?.toString() || "");
    setMinimumPayment(currentDetail?.minimumPayment?.toString() || "");
    setCreditLimit(currentDetail?.creditLimit?.toString() || "");
    setDueDate(currentDetail?.dueDate?.toString() || "");
  };

  const handleSave = async (accId: string) => {
    await updateDebtDetail(accId, {
      interestRate: Number(interestRate) || 0,
      minimumPayment: Number(minimumPayment) || 0,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      dueDate: dueDate ? Number(dueDate) : undefined
    });
    setEditingId(null);
  };

  const calculateMonthsToPayoff = (balance: number, rate: number, payment: number): number | null => {
    if (balance >= 0) return 0; // Paid off
    const p = Math.abs(balance);
    if (payment <= 0) return null; // Will never pay off
    const r = (rate / 100) / 12; // Monthly interest rate
    
    if (r === 0) return Math.ceil(p / payment);
    
    if (payment <= p * r) return null; // Payment doesn't cover interest
    
    const n = -Math.log(1 - (r * p) / payment) / Math.log(1 + r);
    return Math.ceil(n);
  };

  const calculateTotalInterest = (balance: number, rate: number, payment: number, months: number | null): number => {
    if (months === null || months <= 0 || balance >= 0) return 0;
    const p = Math.abs(balance);
    const totalPaid = payment * months;
    return Math.max(0, totalPaid - p);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingDown className="h-32 w-32" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Landmark className="h-6 w-6 text-indigo-600" />
          Debt Management
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Track your credit cards and personal loans. Set your interest rates and minimum payments to visualize your path to debt freedom.
        </p>
      </div>

      {debtAccounts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-indigo-50 rounded-full text-indigo-500 mb-4">
            <CreditCard className="h-8 w-8" />
          </div>
          <h3 className="text-slate-800 font-bold mb-2">No Debt Accounts Found</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            You don't have any credit cards or loan accounts. You can add them from the Accounts page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {debtAccounts.map(account => {
            const detail = debtDetails.find(d => d.accountId === account.id);
            const balance = (account as any).currentBalance; // Should be negative if in debt, depending on how users record
            
            // To be robust, if a loan has a positive balance but it's meant to be debt, we just assume the absolute value is what they owe. 
            // Often, loans are recorded as a negative liability.
            const absBalance = Math.abs(balance);
            
            const isEditing = editingId === account.id;
            const months = detail ? calculateMonthsToPayoff(-absBalance, detail.interestRate, detail.minimumPayment) : null;
            const totalInterest = detail ? calculateTotalInterest(-absBalance, detail.interestRate, detail.minimumPayment, months) : 0;
            
            const progressPct = detail && detail.creditLimit ? Math.min((absBalance / detail.creditLimit) * 100, 100) : 0;
            
            return (
              <div key={account.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                      {account.type === "Credit card" ? <CreditCard className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{account.name}</h3>
                      <p className="text-xs text-slate-500">{account.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800">
                      <span className="text-sm text-slate-400 font-normal mr-1">৳</span>
                      {absBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {detail?.creditLimit && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        of ৳{detail.creditLimit.toLocaleString()} limit
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  {detail?.creditLimit && (
                    <div className="mb-6">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-500">Utilization</span>
                        <span className={`font-bold ${progressPct > 80 ? 'text-rose-500' : progressPct > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {progressPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${progressPct > 80 ? 'bg-rose-500' : progressPct > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Interest Rate (%)</label>
                          <div className="relative">
                            <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input 
                              type="number"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-500"
                              placeholder="e.g. 15.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Monthly Payment</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                            <input 
                              type="number"
                              value={minimumPayment}
                              onChange={(e) => setMinimumPayment(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:border-indigo-500"
                              placeholder="e.g. 5000"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Credit Limit (Optional)</label>
                          <input 
                            type="number"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            placeholder="Limit"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Due Day (1-31)</label>
                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input 
                              type="number"
                              min="1" max="31"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-500"
                              placeholder="e.g. 15"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSave(account.id)}
                          className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Interest Rate</p>
                          <p className="font-bold text-slate-700">{detail?.interestRate || 0}% APR</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Monthly Payment</p>
                          <p className="font-bold text-slate-700">৳{detail?.minimumPayment?.toLocaleString() || 0}</p>
                        </div>
                      </div>

                      {detail && detail.minimumPayment > 0 && absBalance > 0 ? (
                        <div className="mt-auto">
                          {months === null ? (
                            <div className="flex items-start gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <p className="text-xs font-medium leading-relaxed">
                                Your monthly payment does not cover the interest. You will never pay off this debt at this rate.
                              </p>
                            </div>
                          ) : (
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                              <div className="flex justify-between items-end mb-3">
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1 tracking-wider">Time to Payoff</p>
                                  <p className="text-xl font-bold text-indigo-700">{months} {months === 1 ? 'Month' : 'Months'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1 tracking-wider">Total Interest</p>
                                  <p className="text-sm font-bold text-slate-700">৳{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                </div>
                              </div>
                              <p className="text-xs text-indigo-600/80 font-medium">
                                Estimated payoff by {(() => {
                                  const d = new Date();
                                  d.setMonth(d.getMonth() + months);
                                  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                                })()}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-auto flex items-center justify-center py-6">
                          <button
                            onClick={() => handleEdit(account.id, detail)}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            {detail ? "Edit Debt Details" : "Setup Debt Plan"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isEditing && detail && (
                  <div className="bg-white border-t border-slate-100 p-3 flex justify-end">
                    <button
                      onClick={() => handleEdit(account.id, detail)}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit Details
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
