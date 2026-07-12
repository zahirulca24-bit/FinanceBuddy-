import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  FileCheck2,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { Account, Transaction } from "../types";

export const AccountingView: React.FC = () => {
  const {
    accounts,
    transactions,
    categories,
    updateTransaction
  } = useFinance();

  // Active accounting sub-module tab
  const [activeBook, setActiveBook] = useState<"cash" | "bank" | "ie_statement" | "ledger" | "category" | "receivables">("cash");

  // Selected ledger state
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>("");

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT"
    }).format(val).replace("BDT", "৳");
  };

  // --------------------------------------------------------
  // 1. CASH BOOK
  // Filter for transactions that involve Cash-type accounts
  const getCashBookData = () => {
    const cashAccounts = accounts.filter((a) => a.type === "Cash");
    const cashAccountIds = cashAccounts.map((a) => a.id);
    const cashInitialBalance = cashAccounts.reduce((sum, a) => sum + a.initialBalance, 0);

    // Filter relevant transactions chronologically (oldest first for ledgers)
    const sortedTx = [...transactions]
      .reverse()
      .filter((tx) => {
        if (tx.type === "Transfer") {
          return cashAccountIds.includes(tx.account) || (tx.toAccount && cashAccountIds.includes(tx.toAccount));
        }
        return cashAccountIds.includes(tx.account);
      });

    let runningBalance = cashInitialBalance;
    const entries = sortedTx.map((tx) => {
      let debit = 0; // Inflow
      let credit = 0; // Outflow
      const amt = Number(tx.amount) || 0;

      if (tx.type === "Income") {
        debit = amt;
        runningBalance += amt;
      } else if (tx.type === "Expense") {
        credit = amt;
        runningBalance -= amt;
      } else if (tx.type === "Transfer") {
        const isFromCash = cashAccountIds.includes(tx.account);
        const isToCash = tx.toAccount && cashAccountIds.includes(tx.toAccount);

        if (isFromCash && isToCash) {
          // Transfer within cash accounts, net balance doesn't change
        } else if (isFromCash) {
          credit = amt;
          runningBalance -= amt;
        } else if (isToCash) {
          debit = amt;
          runningBalance += amt;
        }
      }

      return {
        ...tx,
        debit,
        credit,
        runningBalance
      };
    });

    return {
      initial: cashInitialBalance,
      entries: entries.reverse(), // Show newest first in UI table
      closing: runningBalance
    };
  };

  // --------------------------------------------------------
  // 2. BANK BOOK
  // Filter for bank / mobile banking / credit cards
  const getBankBookData = () => {
    const bankTypes = ["Bank account", "bKash", "Nagad", "Rocket", "Credit card", "Loan account", "Investment account"];
    const bankAccounts = accounts.filter((a) => bankTypes.includes(a.type));
    const bankAccountIds = bankAccounts.map((a) => a.id);
    const bankInitialBalance = bankAccounts.reduce((sum, a) => sum + a.initialBalance, 0);

    const sortedTx = [...transactions]
      .reverse()
      .filter((tx) => {
        if (tx.type === "Transfer") {
          return bankAccountIds.includes(tx.account) || (tx.toAccount && bankAccountIds.includes(tx.toAccount));
        }
        return bankAccountIds.includes(tx.account);
      });

    let runningBalance = bankInitialBalance;
    const entries = sortedTx.map((tx) => {
      let debit = 0;
      let credit = 0;
      const amt = Number(tx.amount) || 0;

      if (tx.type === "Income") {
        debit = amt;
        runningBalance += amt;
      } else if (tx.type === "Expense") {
        credit = amt;
        runningBalance -= amt;
      } else if (tx.type === "Transfer") {
        const isFromBank = bankAccountIds.includes(tx.account);
        const isToBank = tx.toAccount && bankAccountIds.includes(tx.toAccount);

        if (isFromBank && isToBank) {
          // Transfer within bank accounts
        } else if (isFromBank) {
          credit = amt;
          runningBalance -= amt;
        } else if (isToBank) {
          debit = amt;
          runningBalance += amt;
        }
      }

      return {
        ...tx,
        debit,
        credit,
        runningBalance
      };
    });

    return {
      initial: bankInitialBalance,
      entries: entries.reverse(),
      closing: runningBalance
    };
  };

  // --------------------------------------------------------
  // 3. INCOME & EXPENSE STATEMENT
  const getIEStatementData = () => {
    const incomeByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "Income") {
        incomeByCat[tx.category] = (incomeByCat[tx.category] || 0) + amt;
      } else if (tx.type === "Expense") {
        expenseByCat[tx.category] = (expenseByCat[tx.category] || 0) + amt;
      }
    });

    const totalStatementIncome = Object.values(incomeByCat).reduce((s, a) => s + a, 0);
    const totalStatementExpense = Object.values(expenseByCat).reduce((s, a) => s + a, 0);

    return {
      incomeByCat,
      expenseByCat,
      totalIncome: totalStatementIncome,
      totalExpense: totalStatementExpense,
      netSurplus: totalStatementIncome - totalStatementExpense
    };
  };

  // --------------------------------------------------------
  // 4. ACCOUNT-WISE LEDGER
  const getAccountLedgerData = () => {
    const accId = selectedLedgerAccount || (accounts[0]?.id || "");
    const targetAccount = accounts.find((a) => a.id === accId);
    if (!targetAccount) return null;

    const initial = targetAccount.initialBalance;

    // Filter relevant and sort chronologically (oldest first)
    const sortedTx = [...transactions]
      .reverse()
      .filter((tx) => {
        if (tx.type === "Transfer") {
          return tx.account === accId || tx.toAccount === accId;
        }
        return tx.account === accId;
      });

    let runningBalance = initial;
    const entries = sortedTx.map((tx) => {
      let debit = 0; // inflow
      let credit = 0; // outflow
      const amt = Number(tx.amount) || 0;

      if (tx.type === "Income") {
        debit = amt;
        runningBalance += amt;
      } else if (tx.type === "Expense") {
        credit = amt;
        runningBalance -= amt;
      } else if (tx.type === "Transfer") {
        if (tx.account === accId) {
          credit = amt;
          runningBalance -= amt;
        } else if (tx.toAccount === accId) {
          debit = amt;
          runningBalance += amt;
        }
      }

      return {
        ...tx,
        debit,
        credit,
        runningBalance
      };
    });

    return {
      accountName: targetAccount.name,
      initial,
      entries: entries.reverse(), // Show newest first
      closing: runningBalance
    };
  };

  // --------------------------------------------------------
  // 5. CATEGORY-WISE SUMMARY
  const getCategorySummaryData = () => {
    const summary: Record<string, { type: string; total: number }> = {};

    transactions.forEach((tx) => {
      if (tx.type === "Transfer") return;
      const amt = Number(tx.amount) || 0;
      if (!summary[tx.category]) {
        summary[tx.category] = { type: tx.type, total: 0 };
      }
      summary[tx.category].total += amt;
    });

    return Object.entries(summary).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.total - a.total);
  };

  // --------------------------------------------------------
  // 6. RECEIVABLES AND PAYABLES REPORT
  const getOutstandingReport = () => {
    const pendingReceivables = transactions.filter((tx) => tx.isReceivable === true && tx.isCleared !== true);
    const pendingPayables = transactions.filter((tx) => tx.isPayable === true && tx.isCleared !== true);

    return {
      receivables: pendingReceivables,
      payables: pendingPayables,
      totalReceivable: pendingReceivables.reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
      totalPayable: pendingPayables.reduce((s, tx) => s + (Number(tx.amount) || 0), 0)
    };
  };

  const handleClearOutstanding = async (id: string) => {
    try {
      await updateTransaction(id, { isCleared: true });
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Data pre-fetches
  const cashBook = getCashBookData();
  const bankBook = getBankBookData();
  const ieStatement = getIEStatementData();
  const ledger = getAccountLedgerData();
  const catSummary = getCategorySummaryData();
  const outstanding = getOutstandingReport();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub tabs header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-slate-700" />
            Accounting Statement Books
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Pristine automated double-entry statement sheets computed directly from transaction registries</p>
        </div>
      </div>

      {/* Grid selector buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 bg-slate-100 p-1 rounded-lg">
        {[
          { id: "cash", label: "Cash Book", icon: <DollarSign className="h-3.5 w-3.5" /> },
          { id: "bank", label: "Bank Book", icon: <BookOpen className="h-3.5 w-3.5" /> },
          { id: "ie_statement", label: "Income & Expense", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { id: "ledger", label: "Account Ledger", icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
          { id: "category", label: "Category Summary", icon: <Layers className="h-3.5 w-3.5" /> },
          { id: "receivables", label: "Receivables/Payables", icon: <FileCheck2 className="h-3.5 w-3.5" /> }
        ].map((book) => (
          <button
            key={book.id}
            onClick={() => setActiveBook(book.id as any)}
            className={`py-2 px-3 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeBook === book.id
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50 font-extrabold"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            {book.icon}
            <span>{book.label}</span>
          </button>
        ))}
      </div>

      {/* 1. CASH BOOK VIEW */}
      {activeBook === "cash" && (
        <div id="accounting-cash-book" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Cash Ledger Book</h3>
            <div className="text-xs font-mono flex items-center space-x-4">
              <span className="text-slate-500 font-semibold">Opening: <strong className="text-slate-800 font-bold">{formatCurrency(cashBook.initial)}</strong></span>
              <span className="text-slate-500 font-semibold">Closing: <strong className="text-blue-600 font-bold">{formatCurrency(cashBook.closing)}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-sans uppercase text-[10px] tracking-wider">
                  <th className="p-3">Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Debit (Inflow)</th>
                  <th className="p-3 text-right">Credit (Outflow)</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cashBook.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold italic">
                      No Cash transactions registered.
                    </td>
                  </tr>
                ) : (
                  cashBook.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition font-medium">
                      <td className="p-3 font-mono font-bold text-slate-400">{entry.date}</td>
                      <td className="p-3 font-bold text-slate-800">{entry.description}</td>
                      <td className="p-3 text-slate-500 font-semibold">{entry.category}</td>
                      <td className="p-3 text-right font-sans text-emerald-600 font-bold">
                        {entry.debit > 0 ? `+${formatCurrency(entry.debit)}` : "-"}
                      </td>
                      <td className="p-3 text-right font-sans text-rose-600 font-bold">
                        {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : "-"}
                      </td>
                      <td className="p-3 text-right font-sans text-slate-800 font-extrabold">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BANK BOOK VIEW */}
      {activeBook === "bank" && (
        <div id="accounting-bank-book" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Bank & Digital Accounts Book</h3>
            <div className="text-xs font-mono flex items-center space-x-4">
              <span className="text-slate-500 font-semibold">Opening: <strong className="text-slate-800 font-bold">{formatCurrency(bankBook.initial)}</strong></span>
              <span className="text-slate-500 font-semibold">Closing: <strong className="text-blue-600 font-bold">{formatCurrency(bankBook.closing)}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-sans uppercase text-[10px] tracking-wider">
                  <th className="p-3">Date</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Debit (Inflow)</th>
                  <th className="p-3 text-right">Credit (Outflow)</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {bankBook.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold italic">
                      No Bank transactions registered.
                    </td>
                  </tr>
                ) : (
                  bankBook.entries.map((entry) => {
                    const accObj = accounts.find((a) => a.id === entry.account);
                    const accLabel = accObj ? accObj.name : "Unknown Bank";

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-mono font-bold text-slate-400">{entry.date}</td>
                        <td className="p-3 text-slate-800 font-bold">{accLabel}</td>
                        <td className="p-3 font-semibold text-slate-800">{entry.description}</td>
                        <td className="p-3 text-right font-sans text-emerald-600 font-bold">
                          {entry.debit > 0 ? `+${formatCurrency(entry.debit)}` : "-"}
                        </td>
                        <td className="p-3 text-right font-sans text-rose-600 font-bold">
                          {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : "-"}
                        </td>
                        <td className="p-3 text-right font-sans text-slate-800 font-extrabold">
                          {formatCurrency(entry.runningBalance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. INCOME & EXPENSE STATEMENT VIEW */}
      {activeBook === "ie_statement" && (
        <div id="accounting-ie-statement" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Income & Expense Statement</h3>
            <p className="text-xs text-slate-400 mt-0.5">Periodic net income surpluses (Profit and Loss equivalents)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Income Side */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block border-b border-emerald-100 pb-1 font-sans">Income Streams</span>
              <div className="space-y-2.5">
                {Object.keys(ieStatement.incomeByCat).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No income logged.</p>
                ) : (
                  Object.entries(ieStatement.incomeByCat).map(([cat, total]) => (
                    <div key={cat} className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-600">{cat}</span>
                      <span className="font-sans text-emerald-600 font-bold">{formatCurrency(total)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-700">
                <span>Total Income Revenue</span>
                <span className="font-sans text-emerald-600">{formatCurrency(ieStatement.totalIncome)}</span>
              </div>
            </div>

            {/* Expense Side */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block border-b border-rose-100 pb-1 font-sans">Expense Categories</span>
              <div className="space-y-2.5">
                {Object.keys(ieStatement.expenseByCat).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No expenses logged.</p>
                ) : (
                  Object.entries(ieStatement.expenseByCat).map(([cat, total]) => (
                    <div key={cat} className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-600">{cat}</span>
                      <span className="font-sans text-rose-600 font-bold">{formatCurrency(total)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-700">
                <span>Total Operating Expense</span>
                <span className="font-sans text-rose-600">{formatCurrency(ieStatement.totalExpense)}</span>
              </div>
            </div>
          </div>

          {/* Statement Bottomline */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-inner">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Net Surplus / (Deficit)</span>
            <span className={`text-lg font-bold font-sans ${ieStatement.netSurplus >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {ieStatement.netSurplus >= 0 ? "+" : ""}{formatCurrency(ieStatement.netSurplus)}
            </span>
          </div>
        </div>
      )}

      {/* 4. ACCOUNT-WISE LEDGER VIEW */}
      {activeBook === "ledger" && (
        <div id="accounting-ledger-book" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Account-Wise Ledgers</h3>
              <p className="text-xs text-slate-400 mt-0.5">View chronicled ledger accounts with automated running balances</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 hover:bg-slate-100 font-semibold focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none w-full sm:w-64 transition-all cursor-pointer text-slate-700"
              >
                <option value="">-- Choose Account Ledger --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
              {ledger && ledger.entries.length > 0 && (
                <button
                  onClick={() => {
                    const headers = ["Date", "Description", "Category", "Debit (In)", "Credit (Out)", "Balance"];
                    const csvContent = [
                      headers.join(","),
                      ...ledger.entries.map(entry => {
                        return [
                          entry.date,
                          `"${entry.description.replace(/"/g, '""')}"`,
                          `"${entry.category}"`,
                          entry.debit,
                          entry.credit,
                          entry.runningBalance
                        ].join(",");
                      })
                    ].join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `${ledger.accountName.replace(/\\s+/g, '_')}_ledger.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 border border-slate-200 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition flex items-center justify-center cursor-pointer whitespace-nowrap"
                  title="Export to CSV"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                  Export
                </button>
              )}
            </div>
          </div>

          {ledger ? (
            <div className="space-y-4">
              <div className="text-xs font-mono flex flex-col sm:flex-row justify-between gap-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-600 font-semibold">
                <span>Ledger: <strong className="text-slate-800 font-bold font-sans uppercase text-[10px] tracking-wider">{ledger.accountName}</strong></span>
                <span>Opening: <strong className="text-slate-800 font-bold">{formatCurrency(ledger.initial)}</strong></span>
                <span>Closing: <strong className="text-blue-600 font-bold">{formatCurrency(ledger.closing)}</strong></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-sans uppercase text-[10px] tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Debit (In)</th>
                      <th className="p-3 text-right">Credit (Out)</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {ledger.entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold italic">
                          No transaction records logged in this ledger account.
                        </td>
                      </tr>
                    ) : (
                      ledger.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-3 font-mono font-bold text-slate-400">{entry.date}</td>
                          <td className="p-3 font-bold text-slate-800">{entry.description}</td>
                          <td className="p-3 text-slate-500 font-semibold">{entry.category}</td>
                          <td className="p-3 text-right font-sans text-emerald-600 font-bold">
                            {entry.debit > 0 ? `+${formatCurrency(entry.debit)}` : "-"}
                          </td>
                          <td className="p-3 text-right font-sans text-rose-600 font-bold">
                            {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : "-"}
                          </td>
                          <td className="p-3 text-right font-sans text-slate-800 font-extrabold">
                            {formatCurrency(entry.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 font-semibold italic text-xs flex flex-col items-center justify-center">
              <HelpCircle className="h-8 w-8 text-slate-300 mb-2" />
              <span>Select an account ledger from the dropdown to audit its entries.</span>
            </div>
          )}
        </div>
      )}

      {/* 5. CATEGORY SUMMARY VIEW */}
      {activeBook === "category" && (
        <div id="accounting-category-summary" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Category-Wise Summary Statement</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total volume analysis across category tags (excluding Transfers)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-sans uppercase text-[10px] tracking-wider">
                  <th className="p-3">Category Tag</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Cumulative Volume (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {catSummary.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400 font-semibold italic">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  catSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-bold text-slate-800">{item.name}</td>
                      <td className="p-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                          item.type === "Income"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-sans text-slate-800 font-extrabold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. RECEIVABLES AND PAYABLES REPORT VIEW */}
      {activeBook === "receivables" && (
        <div id="accounting-receivables-payables" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Outstanding Receivables */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Outstanding Receivables (Inflow)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Payments owed to you by clients, friends, or services</p>
                </div>
                <span className="font-sans font-extrabold text-emerald-600 text-sm">
                  {formatCurrency(outstanding.totalReceivable)}
                </span>
              </div>

              <div className="space-y-3">
                {outstanding.receivables.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold italic text-xs">
                    No outstanding receivables.
                  </div>
                ) : (
                  outstanding.receivables.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-lg bg-slate-50/50 border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-xs font-bold text-slate-800 block truncate">{tx.description}</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{tx.date} • {tx.category}</span>
                      </div>
                      <div className="text-right flex flex-col items-end space-y-2 flex-shrink-0">
                        <span className="font-sans font-bold text-emerald-600 text-xs">
                          {formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleClearOutstanding(tx.id)}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition flex items-center cursor-pointer"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Clear</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Outstanding Payables */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Outstanding Payables (Outflow)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pending debts, office bills, credit dues, or loans you owe</p>
                </div>
                <span className="font-sans font-extrabold text-rose-600 text-sm">
                  {formatCurrency(outstanding.totalPayable)}
                </span>
              </div>

              <div className="space-y-3">
                {outstanding.payables.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold italic text-xs">
                    No outstanding payables.
                  </div>
                ) : (
                  outstanding.payables.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-lg bg-slate-50/50 border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-xs font-bold text-slate-800 block truncate">{tx.description}</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{tx.date} • {tx.category}</span>
                      </div>
                      <div className="text-right flex flex-col items-end space-y-2 flex-shrink-0">
                        <span className="font-sans font-bold text-rose-600 text-xs">
                          {formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleClearOutstanding(tx.id)}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition flex items-center cursor-pointer"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Clear</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
