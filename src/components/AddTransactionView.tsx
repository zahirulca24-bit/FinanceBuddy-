import React, { useState, useRef } from "react";
import { useFinance } from "../context/FinanceContext";
import { getAuthHeader } from "../supabase";
import {
  Upload,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  Hash,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Info
} from "lucide-react";
import { ExtractedTransaction, TransactionType } from "../types";

export const AddTransactionView: React.FC = () => {
  const {
    accounts,
    categories,
    addTransaction,
    addAccount
  } = useFinance();

  // Mode: manual or AI review
  const [activeSubTab, setActiveSubTab] = useState<"manual" | "ai">("manual");

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<TransactionType>("Expense");
  const [account, setAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  
  // Outstanding tracking
  const [isOutstanding, setIsOutstanding] = useState<"none" | "receivable" | "payable">("none");
  const [isCleared, setIsCleared] = useState(true);

  // AI Extraction States
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTransaction | null>(null);
  const [extractedFile, setExtractedFile] = useState<{ name: string; size: number } | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [unclearFields, setUnclearFields] = useState<string[]>([]);

  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto trigger scan dialog if requested from Dashboard
  React.useEffect(() => {
    if (localStorage.getItem("triggerAIScan") === "true") {
      localStorage.removeItem("triggerAIScan");
      setActiveSubTab("ai");
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 300);
    }
  }, []);

  // Filter categories by type
  const activeCategories = categories.filter((cat) => cat.type === (type === "Transfer" ? "Expense" : type));

  // Reset form
  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setType("Expense");
    setAccount("");
    setToAccount("");
    setCategory("");
    setDescription("");
    setAmount("");
    setPaymentMethod("");
    setReferenceNumber("");
    setNotes("");
    setIsOutstanding("none");
    setIsCleared(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!account) {
      alert("Please select an account.");
      return;
    }
    if (type === "Transfer" && !toAccount) {
      alert("Please select the destination account.");
      return;
    }
    if (type === "Transfer" && account === toAccount) {
      alert("Source account and destination account cannot be the same.");
      return;
    }

    try {
      const payload = {
        date,
        type,
        account,
        ...(type === "Transfer" ? { toAccount } : {}),
        category: type === "Transfer" ? "Transfer" : category || "Uncategorized",
        description,
        amount: Number(amount),
        paymentMethod,
        referenceNumber,
        notes,
        isReceivable: type === "Income" && isOutstanding === "receivable",
        isPayable: type === "Expense" && isOutstanding === "payable",
        isCleared: isOutstanding === "none" ? true : isCleared
      };

      await addTransaction(payload);
      setSuccessMsg("Transaction added successfully!");
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      alert("Error adding transaction: " + err.message);
    }
  };

  // Convert uploaded file to base64 and call server extraction API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractionError(null);
    setSuccessMsg(null);
    setExtractedData(null);
    setExtractedFile({ name: file.name, size: file.size });
    setIsExtracting(true);
    setActiveSubTab("ai");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];
        const mimeType = file.type || "application/octet-stream";

        const authHeader = await getAuthHeader();
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader,
          },
          body: JSON.stringify({
            fileData: base64Data,
            mimeType: mimeType,
            fileName: file.name,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to extract transaction data");
        }

        const data: ExtractedTransaction = await response.json();
        
        // Track which fields are unclear/unverified to highlight them
        const unverifiedList: string[] = [];
        if (!data.date) unverifiedList.push("date");
        if (!data.amount || data.amount <= 0) unverifiedList.push("amount");
        if (!data.category) unverifiedList.push("category");
        if (!data.description) unverifiedList.push("description");
        if (!data.account) unverifiedList.push("account");

        setUnclearFields(unverifiedList);
        setExtractedData(data);
      } catch (err: any) {
        console.error("AI extraction error:", err);
        setExtractionError(err.message || "Failed to process document with AI.");
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle edit on extracted items
  const handleExtractedFieldChange = (field: keyof ExtractedTransaction, value: any) => {
    if (!extractedData) return;
    const updated = { ...extractedData, [field]: value };
    setExtractedData(updated);

    // If corrected, remove from unclear highlights
    if (value) {
      setUnclearFields((prev) => prev.filter((f) => f !== field));
    }
  };

  // Save extracted transaction to Firestore after user confirmation
  const confirmExtractedSave = async () => {
    if (!extractedData) return;

    // Validation
    if (!extractedData.amount || isNaN(Number(extractedData.amount)) || Number(extractedData.amount) <= 0) {
      alert("Please specify a valid transaction amount.");
      return;
    }
    if (!extractedData.description) {
      alert("Please provide a description.");
      return;
    }

    // Try to find matching Account ID by name or create a standard one if missing
    let targetAccountId = "";
    const matchedAccount = accounts.find((a) =>
      a.name.toLowerCase().includes((extractedData.account || "").toLowerCase()) ||
      (extractedData.account || "").toLowerCase().includes(a.name.toLowerCase())
    );

    if (matchedAccount) {
      targetAccountId = matchedAccount.id;
    } else if (accounts.length > 0) {
      // Fallback to first account
      targetAccountId = accounts[0].id;
    } else {
      alert("No active accounts found. Please configure accounts first.");
      return;
    }

    try {
      const payload = {
        date: extractedData.date || new Date().toISOString().split("T")[0],
        type: extractedData.type || "Expense",
        account: targetAccountId,
        category: extractedData.category || "Other expense",
        description: extractedData.description,
        amount: Number(extractedData.amount),
        paymentMethod: extractedData.paymentMethod || "",
        referenceNumber: extractedData.referenceNumber || "",
        notes: `[AI Extracted] ${extractedData.notes || ""}`,
        isReceivable: false,
        isPayable: false,
        isCleared: true
      };

      await addTransaction(payload);
      setSuccessMsg("AI-extracted transaction reviewed and saved successfully!");
      setExtractedData(null);
      setExtractedFile(null);
      setActiveSubTab("manual");
      resetForm();
    } catch (err: any) {
      alert("Error saving transaction: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* File Upload Header Widget */}
      <div id="ai-extraction-card" className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-5 rounded-xl shadow-md border border-blue-950">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold flex items-center tracking-wider uppercase text-blue-100">
              <Sparkles className="h-4 w-4 text-amber-400 mr-2 animate-pulse" />
              AI Smart Receipt Scanner
            </h3>
            <p className="text-xs text-blue-200">
              Upload receipt pictures, PDF bank statements, CSV, or Excel spreadsheets to extract transaction details instantly!
            </p>
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-blue-900 hover:bg-slate-100 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-all w-full md:w-auto cursor-pointer"
            >
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Upload Document</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border border-slate-200 bg-slate-100/80 p-1 rounded-lg">
        <button
          onClick={() => setActiveSubTab("manual")}
          id="btn-subtab-manual"
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
            activeSubTab === "manual"
              ? "bg-white text-blue-800 shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveSubTab("ai")}
          id="btn-subtab-ai"
          className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === "ai"
              ? "bg-white text-blue-800 shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>AI Scan Reviews</span>
          {extractedData && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center text-emerald-800 text-xs shadow-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600 mr-2 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Loading Extraction */}
      {isExtracting && (
        <div id="ai-loading-panel" className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <Loader2 className="h-10 w-10 text-blue-700 animate-spin mb-4" />
          <h4 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Processing Document with Gemini AI...</h4>
          <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
            We are analyzing your upload "{extractedFile?.name}" to extract dates, accounts, values, categories, and payment references. This takes a few seconds.
          </p>
        </div>
      )}

      {/* AI Extraction Error */}
      {extractionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center text-rose-800 text-xs shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 mr-2 flex-shrink-0" />
          <span className="font-medium">{extractionError}</span>
        </div>
      )}

      {/* 1. Manual Form View */}
      {activeSubTab === "manual" && !isExtracting && (
        <form onSubmit={handleManualSubmit} id="manual-transaction-form" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">New Manual Transaction</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Transaction Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Transaction Type</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(["Income", "Expense", "Transfer"] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      if (t === "Transfer") {
                        setCategory("Transfer");
                      } else {
                        setCategory("");
                      }
                    }}
                    className={`py-1.5 rounded-md text-[11px] font-bold text-center uppercase tracking-wider transition-all cursor-pointer ${
                      type === t
                        ? t === "Income"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : t === "Expense"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (৳)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold font-sans">৳</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Account Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {type === "Transfer" ? "From Account" : "Account"}
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                required
              >
                <option value="">-- Select Account --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) - ৳{(acc as any).currentBalance ?? acc.initialBalance}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Account (Only for Transfers) */}
            {type === "Transfer" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To Account</label>
                <select
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  required
                >
                  <option value="">-- Select Destination Account --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) - ৳{(acc as any).currentBalance ?? acc.initialBalance}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Selector (Hidden for Transfers) */}
            {type !== "Transfer" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  required
                >
                  <option value="">-- Select Category --</option>
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Title</label>
              <input
                type="text"
                placeholder="e.g. June Monthly Salary, Office stationary, Shopping, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Method</label>
              <input
                type="text"
                placeholder="e.g. Cash, Credit Card, Bank Transfer, bKash"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reference / TXN ID</label>
              <input
                type="text"
                placeholder="e.g. TXN92019A8, Check #3910"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extra Notes</label>
              <textarea
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
              />
            </div>

            {/* Outstanding receivables / payables tracking (Only for Income and Expense) */}
            {type !== "Transfer" && (
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 shadow-inner">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <Info className="h-4 w-4 mr-1.5 text-blue-600" />
                  Receivable & Payable Tracking
                </span>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center text-xs text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="outstanding"
                      checked={isOutstanding === "none"}
                      onChange={() => setIsOutstanding("none")}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500/50 border-slate-300"
                    />
                    Standard completed transaction
                  </label>

                  {type === "Income" && (
                    <label className="flex items-center text-xs text-slate-600 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="outstanding"
                        checked={isOutstanding === "receivable"}
                        onChange={() => {
                          setIsOutstanding("receivable");
                          setIsCleared(false);
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500/50 border-slate-300"
                      />
                      Mark as Receivable (money owed to me)
                    </label>
                  )}

                  {type === "Expense" && (
                    <label className="flex items-center text-xs text-slate-600 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="outstanding"
                        checked={isOutstanding === "payable"}
                        onChange={() => {
                          setIsOutstanding("payable");
                          setIsCleared(false);
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500/50 border-slate-300"
                      />
                      Mark as Payable (I owe this money)
                    </label>
                  )}
                </div>

                {isOutstanding !== "none" && (
                  <div className="flex items-center space-x-3 pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status:</span>
                    <label className="flex items-center text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCleared}
                        onChange={(e) => setIsCleared(e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500/50 border-slate-300"
                      />
                      Cleared (Settled / Paid)
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            id="btn-save-manual-tx"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-lg shadow-sm hover:shadow-md transition-all uppercase tracking-wider cursor-pointer"
          >
            Save Transaction
          </button>
        </form>
      )}

      {/* 2. AI Scanning Review Panel */}
      {activeSubTab === "ai" && !isExtracting && (
        <div id="ai-review-panel" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">AI Scanning Verification</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Review and verify extracted transaction fields before writing to ledger.</p>
            </div>
            {extractedFile && (
              <span className="bg-amber-50 text-amber-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-amber-200">
                Parsed: {extractedFile.name}
              </span>
            )}
          </div>

          {!extractedData ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Upload className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">No Scanned Items</h4>
              <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">
                Drop your statement PDFs, Excel files, or receipt pictures into the top box, and the AI reviews will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {unclearFields.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start text-amber-800 text-xs shadow-sm">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider">Action Required</span>
                    <p className="mt-0.5 leading-relaxed">
                      The AI could not confidently identify all fields (highlighted below). Please correct or fill them in before saving.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className={unclearFields.includes("date") ? "p-1.5 bg-amber-50 rounded-lg border border-amber-200" : ""}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Date {unclearFields.includes("date") && <span className="text-red-500">* REQUIRED</span>}
                  </label>
                  <input
                    type="date"
                    value={extractedData.date}
                    onChange={(e) => handleExtractedFieldChange("date", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={extractedData.type}
                    onChange={(e) => handleExtractedFieldChange("type", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  >
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>

                {/* Amount */}
                <div className={unclearFields.includes("amount") ? "p-1.5 bg-amber-50 rounded-lg border border-amber-200" : ""}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Amount (৳) {unclearFields.includes("amount") && <span className="text-red-500">* REQUIRED</span>}
                  </label>
                  <input
                    type="number"
                    value={extractedData.amount || ""}
                    onChange={(e) => handleExtractedFieldChange("amount", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  />
                </div>

                {/* Account Name */}
                <div className={unclearFields.includes("account") ? "p-1.5 bg-amber-50 rounded-lg border border-amber-200" : ""}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Account (Source / Target) {unclearFields.includes("account") && <span className="text-amber-600">(Unverified)</span>}
                  </label>
                  <select
                    value={extractedData.account}
                    onChange={(e) => handleExtractedFieldChange("account", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  >
                    <option value="">-- Match Account --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className={unclearFields.includes("category") ? "p-1.5 bg-amber-50 rounded-lg border border-amber-200" : ""}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category {unclearFields.includes("category") && <span className="text-amber-600">(Unverified)</span>}
                  </label>
                  <input
                    type="text"
                    value={extractedData.category}
                    onChange={(e) => handleExtractedFieldChange("category", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                    placeholder="e.g. Rent, Food, Utility bills"
                  />
                </div>

                {/* Description */}
                <div className={`md:col-span-2 ${unclearFields.includes("description") ? "p-1.5 bg-amber-50 rounded-lg border border-amber-200" : ""}`}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Description {unclearFields.includes("description") && <span className="text-red-500">* REQUIRED</span>}
                  </label>
                  <input
                    type="text"
                    value={extractedData.description}
                    onChange={(e) => handleExtractedFieldChange("description", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Method</label>
                  <input
                    type="text"
                    value={extractedData.paymentMethod}
                    onChange={(e) => handleExtractedFieldChange("paymentMethod", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reference Number / Transaction ID</label>
                  <input
                    type="text"
                    value={extractedData.referenceNumber}
                    onChange={(e) => handleExtractedFieldChange("referenceNumber", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extracted Notes / Remarks</label>
                  <textarea
                    value={extractedData.notes}
                    onChange={(e) => handleExtractedFieldChange("notes", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white hover:bg-slate-50 transition-all"
                  />
                </div>
              </div>

              {/* Operations Footer */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setExtractedData(null);
                    setExtractedFile(null);
                    setActiveSubTab("manual");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-1.5 text-rose-500" />
                  Discard Scan
                </button>
                <button
                  onClick={confirmExtractedSave}
                  id="btn-confirm-ai-save"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm hover:shadow flex items-center justify-center space-x-2 transition cursor-pointer uppercase tracking-wider"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm and Write to Ledger</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
