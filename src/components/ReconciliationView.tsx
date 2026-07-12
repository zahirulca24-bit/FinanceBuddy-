import React, { useState, useEffect } from "react";
import { useFinance } from "../context/FinanceContext";
import { getAuthHeader } from "../supabase";
import {
  BankStatementRow,
  ReconciliationAdjustment,
  ReconciliationRecord,
  Account,
  Transaction,
  AdjustmentType
} from "../types";
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  Printer,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Calendar,
  DollarSign,
  ArrowRight,
  BookOpen,
  Settings,
  Info
} from "lucide-react";

export const ReconciliationView: React.FC = () => {
  const {
    accounts,
    transactions,
    reconciliations,
    addReconciliation,
    updateReconciliation,
    deleteReconciliation,
    addTransaction
  } = useFinance();

  // Selected Bank Account & setup details
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  // Active view states
  // "history" | "setup" | "review" | "workspace" | "report"
  const [view, setView] = useState<"history" | "setup" | "review" | "workspace" | "report">("history");

  // File Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);

  // Review states (before import confirmation)
  const [reviewRows, setReviewRows] = useState<BankStatementRow[]>([]);
  const [reviewOpening, setReviewOpening] = useState(0);
  const [reviewClosing, setReviewClosing] = useState(0);

  // Workspace states
  const [activeRecId, setActiveRecId] = useState<string | null>(null);
  const [statementRows, setStatementRows] = useState<BankStatementRow[]>([]);
  const [adjustments, setAdjustments] = useState<ReconciliationAdjustment[]>([]);
  const [preparedBy, setPreparedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Workspace matching control states
  const [selectedStatementRowId, setSelectedStatementRowId] = useState<string | null>(null);
  const [isMultiMatching, setIsMultiMatching] = useState(false);
  const [selectedMultiRowIds, setSelectedMultiRowIds] = useState<string[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Adjustments form state
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [adjType, setAdjType] = useState<AdjustmentType>("Outstanding Cheque");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjAmount, setAdjAmount] = useState(0);
  const [adjRef, setAdjRef] = useState("");
  const [adjDate, setAdjDate] = useState("");

  // Ledger entry quick creation modal
  const [quickLedgerRow, setQuickLedgerRow] = useState<BankStatementRow | null>(null);
  const [quickLedgerAdj, setQuickLedgerAdj] = useState<ReconciliationAdjustment | null>(null);
  const [quickCategory, setQuickCategory] = useState("Bank Charge");
  const [quickDesc, setQuickDesc] = useState("");

  // Target report reference
  const [reportRec, setReportRec] = useState<ReconciliationRecord | null>(null);

  // Reset setup states
  const resetSetup = () => {
    setSelectedAccountId("");
    setStartDate("");
    setEndDate("");
    setOpeningBalance(0);
    setClosingBalance(0);
    setReviewRows([]);
    setFileName("");
    setFileSize(0);
    setUploadError(null);
  };

  // Helper: Format Currency BDT (৳)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT"
    }).format(val).replace("BDT", "৳");
  };

  // Get active selected account details
  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  // Get Ledger Transactions for the active account within the date range
  const getLedgerTransactionsForPeriod = (): Transaction[] => {
    if (!selectedAccountId) return [];
    return transactions.filter((tx) => {
      // Must affect the selected account
      const affectsAccount = tx.account === selectedAccountId || tx.toAccount === selectedAccountId;
      if (!affectsAccount) return false;

      // Date check
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      return true;
    });
  };

  const periodLedgerTransactions = getLedgerTransactionsForPeriod();

  // Helper: Calculate live ledger closing balance up to the statement end date
  const getLedgerClosingBalance = (): number => {
    if (!selectedAccountId) return 0;
    const targetAcc = accounts.find((a) => a.id === selectedAccountId);
    if (!targetAcc) return 0;

    let balance = targetAcc.initialBalance;
    // Process all ledger transactions sequentially up to endDate
    transactions.forEach((tx) => {
      if (endDate && tx.date > endDate) return; // skip transactions after endDate
      const amt = Number(tx.amount) || 0;
      if (tx.type === "Income" && tx.account === selectedAccountId) {
        balance += amt;
      } else if (tx.type === "Expense" && tx.account === selectedAccountId) {
        balance -= amt;
      } else if (tx.type === "Transfer") {
        if (tx.account === selectedAccountId) balance -= amt;
        if (tx.toAccount === selectedAccountId) balance += amt;
      }
    });
    return balance;
  };

  // Duplicate Checker: Checks against historical reconciliations' statement rows
  const isDuplicateStatementRow = (row: Omit<BankStatementRow, "id" | "status" | "matchedLedgerIds">) => {
    return reconciliations.some((rec) => {
      if (rec.accountId !== selectedAccountId) return false;
      return rec.statementRows?.some(
        (histRow) =>
          histRow.date === row.date &&
          Math.abs(histRow.debit - row.debit) < 0.01 &&
          Math.abs(histRow.credit - row.credit) < 0.01 &&
          histRow.referenceNumber === row.referenceNumber &&
          histRow.description.toLowerCase() === row.description.toLowerCase()
      );
    });
  };

  // Safe manual CSV extraction
  const handleCSVTextParse = (text: string, fName: string, fSize: number) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error("CSV file does not contain enough rows.");
      }

      const parseCSVLine = (line: string) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

      // Attempt smart column mapping
      let dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("txndate"));
      let descIdx = headers.findIndex(
        (h) => h.includes("desc") || h.includes("particular") || h.includes("narration") || h.includes("detail")
      );
      let refIdx = headers.findIndex(
        (h) => h.includes("ref") || h.includes("cheque") || h.includes("chk") || h.includes("id") || h.includes("txnno")
      );
      let debitIdx = headers.findIndex(
        (h) => h.includes("debit") || h.includes("withdrawal") || h.includes("out") || h.includes("paid") || h.includes("dr")
      );
      let creditIdx = headers.findIndex(
        (h) => h.includes("credit") || h.includes("deposit") || h.includes("in") || h.includes("received") || h.includes("cr")
      );
      let balIdx = headers.findIndex((h) => h.includes("balance") || h.includes("bal") || h.includes("running"));

      // Standard Fallbacks
      if (dateIdx === -1) dateIdx = 0;
      if (descIdx === -1) descIdx = 1;
      if (refIdx === -1) refIdx = 2;
      if (debitIdx === -1) debitIdx = 3;
      if (creditIdx === -1) creditIdx = 4;
      if (balIdx === -1) balIdx = 5;

      const extractedRows: BankStatementRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = parseCSVLine(line);
        if (parts.length < 2) continue;

        const date = parts[dateIdx] || "";
        const description = parts[descIdx] || "";
        const referenceNumber = parts[refIdx] || "";

        let debit = 0;
        let credit = 0;

        if (debitIdx !== -1 && parts[debitIdx]) {
          debit = Math.abs(parseFloat(parts[debitIdx].replace(/[^0-9.-]/g, ""))) || 0;
        }
        if (creditIdx !== -1 && parts[creditIdx]) {
          credit = Math.abs(parseFloat(parts[creditIdx].replace(/[^0-9.-]/g, ""))) || 0;
        }

        // Single Combined Amount column check
        if (debitIdx === creditIdx && debitIdx !== -1 && parts[debitIdx]) {
          const combinedVal = parseFloat(parts[debitIdx].replace(/[^0-9.-]/g, "")) || 0;
          if (combinedVal < 0) {
            debit = Math.abs(combinedVal);
            credit = 0;
          } else {
            credit = combinedVal;
            debit = 0;
          }
        }

        let runningBalance = 0;
        if (balIdx !== -1 && parts[balIdx]) {
          runningBalance = parseFloat(parts[balIdx].replace(/[^0-9.-]/g, "")) || 0;
        }

        // Standardize date to YYYY-MM-DD
        let formattedDate = date;
        if (date.includes("/") || date.includes("-")) {
          const sep = date.includes("/") ? "/" : "-";
          const bits = date.split(sep);
          if (bits.length === 3) {
            if (bits[2].length === 4) {
              const d = new Date(date);
              if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().split("T")[0];
              }
            } else if (bits[0].length === 4) {
              formattedDate = `${bits[0]}-${bits[1].padStart(2, "0")}-${bits[2].padStart(2, "0")}`;
            }
          }
        }

        const baseRow: Omit<BankStatementRow, "id" | "status" | "matchedLedgerIds"> = {
          date: formattedDate || new Date().toISOString().split("T")[0],
          description,
          referenceNumber,
          debit,
          credit,
          runningBalance
        };

        const duplicate = isDuplicateStatementRow(baseRow);

        extractedRows.push({
          id: `csv-${i}-${Date.now()}`,
          ...baseRow,
          originalValues: { ...baseRow },
          auditTrail: [],
          status: duplicate ? "Duplicate" : "Unmatched",
          matchedLedgerIds: []
        });
      }

      setFileName(fName);
      setFileSize(fSize);
      setReviewRows(extractedRows);
      // Auto estimate opening/closing based on running balance
      if (extractedRows.length > 0) {
        setReviewOpening(extractedRows[0].runningBalance - (extractedRows[0].credit - extractedRows[0].debit));
        setReviewClosing(extractedRows[extractedRows.length - 1].runningBalance);
      }
      setView("review");
      setIsUploading(false);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to parse CSV file structure.");
      setIsUploading(false);
    }
  };

  // Drag and Drop File Handlers
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    const fName = file.name;
    const fSize = file.size;
    const mime = file.type;

    // Direct Parsing for CSV & simple excel text representation
    if (mime === "text/csv" || fName.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        handleCSVTextParse(text, fName, fSize);
      };
      reader.readAsText(file);
      return;
    }

    // For PDFs and Screenshots, use server-side Gemini extract
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result?.toString().split(",")[1];
        if (!base64Data) throw new Error("Could not read file base64 data.");

        const authHeader = await getAuthHeader();
        const response = await fetch("/api/reconcile-extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            fileData: base64Data,
            mimeType: mime || "application/pdf",
            fileName: fName
          })
        });

        if (!response.ok) {
          const errRes = await response.json();
          throw new Error(errRes.error || "Server failed to extract statement items.");
        }

        const result = await response.json();
        const rawRows = result.transactions || [];

        const formattedRows: BankStatementRow[] = rawRows.map((row: any, idx: number) => {
          const baseRow = {
            date: row.date || new Date().toISOString().split("T")[0],
            description: row.description || "",
            referenceNumber: row.referenceNumber || "",
            debit: Number(row.debit) || 0,
            credit: Number(row.credit) || 0,
            runningBalance: Number(row.runningBalance) || 0
          };

          const duplicate = isDuplicateStatementRow(baseRow);

          return {
            id: `gemini-${idx}-${Date.now()}`,
            ...baseRow,
            originalValues: { ...baseRow },
            auditTrail: [],
            status: duplicate ? "Duplicate" : "Unmatched",
            matchedLedgerIds: []
          };
        });

        setFileName(fName);
        setFileSize(fSize);
        setReviewRows(formattedRows);
        setReviewOpening(Number(result.openingBalance) || 0);
        setReviewClosing(Number(result.closingBalance) || 0);
        setView("review");
      } catch (err: any) {
        console.error(err);
        setUploadError(err.message || "Failed to extract bank statement details via Gemini.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Editable Review Table Handlers
  const handleAddReviewRow = () => {
    const baseRow = {
      date: new Date().toISOString().split("T")[0],
      description: "Manual Statement Row",
      referenceNumber: "",
      debit: 0,
      credit: 0,
      runningBalance: 0
    };
    const newRow: BankStatementRow = {
      id: `manual-rev-${Date.now()}`,
      ...baseRow,
      originalValues: { ...baseRow },
      auditTrail: ["Row created manually in review table"],
      status: "Unmatched",
      matchedLedgerIds: []
    };
    setReviewRows([...reviewRows, newRow]);
  };

  const handleUpdateReviewRow = (id: string, field: keyof BankStatementRow, value: any) => {
    setReviewRows(
      reviewRows.map((row) => {
        if (row.id !== id) return row;

        const original = row.originalValues || { ...row };
        const auditTrail = [...(row.auditTrail || [])];
        const prevVal = row[field];

        if (prevVal !== value) {
          auditTrail.push(`Modified ${field} from "${prevVal}" to "${value}"`);
        }

        const updatedRow = {
          ...row,
          [field]: value,
          auditTrail,
          originalValues: original
        };

        // If duplicate is changed, check status
        if (field === "date" || field === "debit" || field === "credit" || field === "referenceNumber" || field === "description") {
          const baseCheck = {
            date: updatedRow.date,
            description: updatedRow.description,
            referenceNumber: updatedRow.referenceNumber,
            debit: updatedRow.debit,
            credit: updatedRow.credit,
            runningBalance: updatedRow.runningBalance
          };
          updatedRow.status = isDuplicateStatementRow(baseCheck) ? "Duplicate" : "Unmatched";
        }

        return updatedRow;
      })
    );
  };

  const handleDeleteReviewRow = (id: string) => {
    setReviewRows(reviewRows.filter((row) => row.id !== id));
  };

  // Save/Confirm Review Rows and Initialize Workspace
  const handleConfirmImport = async () => {
    if (!selectedAccountId) {
      alert("Please select a bank account first.");
      return;
    }

    // Set opening/closing balance from review
    setOpeningBalance(reviewOpening);
    setClosingBalance(reviewClosing);

    // Filter duplicates or prompt? We import everything, keeping status as Duplicate for duplicates so they are skipped in reconciliations.
    const finalRows = [...reviewRows];

    // Trigger automatic suggestion matches
    const initializedRows = finalRows.map((row) => {
      if (row.status === "Duplicate") return row;

      // Find exact amount matching in ledger
      const isOut = row.debit > 0;
      const targetAmount = isOut ? row.debit : row.credit;

      // Filter candidate ledger items
      const candidates = periodLedgerTransactions.filter((tx) => {
        const matchesDirection = isOut
          ? tx.type === "Expense" || (tx.type === "Transfer" && tx.account === selectedAccountId)
          : tx.type === "Income" || (tx.type === "Transfer" && tx.toAccount === selectedAccountId);

        if (!matchesDirection) return false;
        return Math.abs(tx.amount - targetAmount) < 0.01;
      });

      // Find exact date matches first
      const exactDateMatch = candidates.find((tx) => tx.date === row.date);
      if (exactDateMatch) {
        return {
          ...row,
          status: "Matched" as const,
          matchedLedgerIds: [exactDateMatch.id]
        };
      }

      // Find suggested date matches (within 5 days)
      const dateCloseMatch = candidates.find((tx) => {
        const d1 = new Date(row.date);
        const d2 = new Date(tx.date);
        const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 5;
      });

      if (dateCloseMatch) {
        return {
          ...row,
          status: "Suggested Match" as const,
          matchedLedgerIds: [dateCloseMatch.id]
        };
      }

      return row;
    });

    // Compute dynamic auto adjustments based on unmatched items
    // Let's pre-populate Outstanding Cheques & Deposits in Transit for user ease!
    const initialAdjustments: ReconciliationAdjustment[] = [];

    // Save as draft in Firestore first
    const newRecordData = {
      accountId: selectedAccountId,
      accountName: activeAccount?.name || "Unknown Account",
      startDate,
      endDate,
      openingBalance: reviewOpening,
      closingBalance: reviewClosing,
      status: "Draft" as const,
      statementFileName: fileName,
      statementFileSize: fileSize,
      statementRows: initializedRows,
      adjustments: initialAdjustments,
      summary: {
        statementClosingBalance: reviewClosing,
        depositsInTransit: 0,
        outstandingCheques: 0,
        adjustedBankBalance: reviewClosing,
        ledgerClosingBalance: getLedgerClosingBalance(),
        ledgerAdjustments: 0,
        adjustedLedgerBalance: getLedgerClosingBalance(),
        difference: reviewClosing - getLedgerClosingBalance()
      },
      preparedBy: "Auditor Workspace",
      notes: ""
    };

    try {
      const recId = await addReconciliation(newRecordData);
      setActiveRecId(recId);
      setStatementRows(initializedRows);
      setAdjustments(initialAdjustments);
      setPreparedBy("Auditor Workspace");
      setNotes("");
      setView("workspace");
    } catch (err) {
      console.error(err);
      alert("Failed to initialize reconciliation workspace in Firestore.");
    }
  };

  // Reopen existing reconciliation record (Draft or Completed)
  const handleReopenRecord = (rec: ReconciliationRecord) => {
    setSelectedAccountId(rec.accountId);
    setStartDate(rec.startDate);
    setEndDate(rec.endDate);
    setOpeningBalance(rec.openingBalance);
    setClosingBalance(rec.closingBalance);
    setFileName(rec.statementFileName || "");
    setFileSize(rec.statementFileSize || 0);

    setActiveRecId(rec.id);
    setStatementRows(rec.statementRows || []);
    setAdjustments(rec.adjustments || []);
    setPreparedBy(rec.preparedBy || "");
    setNotes(rec.notes || "");

    if (rec.status === "Completed") {
      setReportRec(rec);
      setView("report");
    } else {
      setView("workspace");
    }
  };

  // Matching Controls Handlers

  // 1. Accept suggested match
  const handleAcceptSuggestedMatch = (rowId: string) => {
    setStatementRows(
      statementRows.map((row) => {
        if (row.id === rowId && row.status === "Suggested Match") {
          return {
            ...row,
            status: "Matched" as const
          };
        }
        return row;
      })
    );
  };

  // 2. Unmatch row
  const handleUnmatchRow = (rowId: string) => {
    setStatementRows(
      statementRows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            status: "Unmatched" as const,
            matchedLedgerIds: []
          };
        }
        return row;
      })
    );
  };

  // 3. Manual Match Modal triggers
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchRow, setMatchRow] = useState<BankStatementRow | null>(null);
  const [matchSelectedLedgerIds, setMatchSelectedLedgerIds] = useState<string[]>([]);

  const handleOpenManualMatch = (row: BankStatementRow) => {
    setMatchRow(row);
    setMatchSelectedLedgerIds(row.matchedLedgerIds || []);
    setShowMatchModal(true);
  };

  const handleConfirmManualMatch = () => {
    if (!matchRow) return;

    const matchedCount = matchSelectedLedgerIds.length;
    let newStatus: BankStatementRow["status"] = "Unmatched";
    if (matchedCount === 1) {
      newStatus = "Manually Matched";
    } else if (matchedCount > 1) {
      newStatus = "Partially Matched"; // Split matching scenario
    }

    setStatementRows(
      statementRows.map((row) => {
        if (row.id === matchRow.id) {
          return {
            ...row,
            status: newStatus,
            matchedLedgerIds: matchSelectedLedgerIds
          };
        }
        return row;
      })
    );
    setShowMatchModal(false);
    setMatchRow(null);
  };

  // 4. Split / Multiple Bank Statement rows matched to one ledger entry
  const [showMultiMatchModal, setShowMultiMatchModal] = useState(false);
  const [multiSelectedLedgerId, setMultiSelectedLedgerId] = useState("");

  const handleOpenMultiMatch = () => {
    if (selectedMultiRowIds.length < 2) {
      alert("Please select at least 2 statement rows to match against one ledger entry.");
      return;
    }
    setMultiSelectedLedgerId("");
    setShowMultiMatchModal(true);
  };

  const handleConfirmMultiMatch = () => {
    if (!multiSelectedLedgerId) return;

    setStatementRows(
      statementRows.map((row) => {
        if (selectedMultiRowIds.includes(row.id)) {
          return {
            ...row,
            status: "Manually Matched" as const,
            matchedLedgerIds: [multiSelectedLedgerId]
          };
        }
        return row;
      })
    );

    setSelectedMultiRowIds([]);
    setIsMultiMatching(false);
    setShowMultiMatchModal(false);
  };

  // 5. Toggle Row status as Bank-Only or Duplicate
  const handleMarkRowStatus = (rowId: string, status: BankStatementRow["status"]) => {
    setStatementRows(
      statementRows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            status,
            matchedLedgerIds: status === "Duplicate" || status === "Bank-Only" ? [] : row.matchedLedgerIds
          };
        }
        return row;
      })
    );
  };

  // Quick General Ledger Entry creation for Bank-Only items (fees, interest, direct debits)
  const handleOpenQuickLedger = (row: BankStatementRow) => {
    setQuickLedgerRow(row);
    setQuickLedgerAdj(null);
    setQuickCategory(row.debit > 0 ? "Office expense" : "Interest income");
    setQuickDesc(row.description);
    setSelectedStatementRowId(row.id);
  };

  const handleOpenQuickLedgerFromAdj = (adj: ReconciliationAdjustment) => {
    setQuickLedgerRow(null);
    setQuickLedgerAdj(adj);
    setQuickCategory(adj.type === "Bank Charge" ? "Office expense" : "Interest income");
    setQuickDesc(adj.description);
  };

  const handleConfirmQuickLedger = async () => {
    const isOut = quickLedgerRow ? quickLedgerRow.debit > 0 : quickLedgerAdj && quickLedgerAdj.type !== "Bank Interest";
    const amount = quickLedgerRow
      ? isOut
        ? quickLedgerRow.debit
        : quickLedgerRow.credit
      : quickLedgerAdj?.amount || 0;
    const date = quickLedgerRow ? quickLedgerRow.date : quickLedgerAdj?.date || new Date().toISOString().split("T")[0];
    const ref = quickLedgerRow ? quickLedgerRow.referenceNumber : quickLedgerAdj?.referenceNumber || "";

    try {
      // Create actual Firestore ledger transaction
      await addTransaction({
        date,
        type: isOut ? "Expense" : "Income",
        account: selectedAccountId,
        category: quickCategory,
        description: quickDesc,
        amount,
        referenceNumber: ref,
        paymentMethod: "Bank Transfer",
        isCleared: true,
        notes: `Created during reconciliation workspace for Statement: ${fileName}`
      });

      // Update local workspace row match if row-triggered
      if (quickLedgerRow) {
        // We let the transaction sync in real-time, but to quickly pair up, we'll mark this row as Matched!
        // The real-time listener will fetch the new transaction, and our auto match can hook it up.
        setStatementRows(
          statementRows.map((row) => {
            if (row.id === quickLedgerRow.id) {
              return {
                ...row,
                status: "Matched" as const,
                auditTrail: [...(row.auditTrail || []), `Created and linked ledger entry on ${new Date().toLocaleDateString()}`]
              };
            }
            return row;
          })
        );
      }

      // Update adjustment item if adjustment-triggered
      if (quickLedgerAdj) {
        setAdjustments(
          adjustments.map((adj) => {
            if (adj.id === quickLedgerAdj.id) {
              return {
                ...adj,
                isLedgerCreated: true
              };
            }
            return adj;
          })
        );
      }

      setQuickLedgerRow(null);
      setQuickLedgerAdj(null);
      alert("Ledger entry created successfully! It is now recorded in your general ledger.");
    } catch (err) {
      console.error(err);
      alert("Failed to record ledger entry in general ledger.");
    }
  };

  // Adjustments Panel Handlers
  const handleAddAdjustment = () => {
    if (!adjDesc || adjAmount <= 0) {
      alert("Please provide a description and a positive amount.");
      return;
    }

    const newAdj: ReconciliationAdjustment = {
      id: `adj-${Date.now()}`,
      type: adjType,
      description: adjDesc,
      amount: adjAmount,
      referenceNumber: adjRef,
      date: adjDate || new Date().toISOString().split("T")[0],
      isLedgerCreated: false
    };

    setAdjustments([...adjustments, newAdj]);
    // Reset form
    setAdjDesc("");
    setAdjAmount(0);
    setAdjRef("");
    setAdjDate("");
    setShowAdjForm(false);
  };

  const handleDeleteAdjustment = (id: string) => {
    setAdjustments(adjustments.filter((a) => a.id !== id));
  };

  // Math Reconciliation Summary Computation
  const computeReconciliationSummary = () => {
    // Statement Closing Balance
    const stmtClosing = closingBalance;

    // Deposits in Transit: "Deposit in Transit" adjustments
    const depositsInTransit = adjustments
      .filter((a) => a.type === "Deposit in Transit")
      .reduce((sum, a) => sum + Number(a.amount), 0);

    // Outstanding Cheques: "Outstanding Cheque" adjustments
    const outstandingCheques = adjustments
      .filter((a) => a.type === "Outstanding Cheque")
      .reduce((sum, a) => sum + Number(a.amount), 0);

    // Adjusted Bank Balance = stmtClosing + depositsInTransit - outstandingCheques
    const adjustedBankBalance = stmtClosing + depositsInTransit - outstandingCheques;

    // Ledger Closing Balance
    const ledgerClosing = getLedgerClosingBalance();

    // Ledger Adjustments:
    // Add additions: Bank Interest, other ledger additions
    // Less subtractions: Bank Charge, Direct Debit, Standing Order, Returned Cheque
    const ledgerAdditions = adjustments
      .filter((a) => a.type === "Bank Interest" && !a.isLedgerCreated)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const ledgerSubtractions = adjustments
      .filter(
        (a) =>
          (a.type === "Bank Charge" ||
            a.type === "Direct Debit" ||
            a.type === "Standing Order" ||
            a.type === "Returned Cheque") &&
          !a.isLedgerCreated
      )
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const ledgerAdjustments = ledgerAdditions - ledgerSubtractions;

    // Adjusted Ledger Balance = ledgerClosing + ledgerAdjustments
    const adjustedLedgerBalance = ledgerClosing + ledgerAdjustments;

    // Difference = adjustedBankBalance - adjustedLedgerBalance
    const difference = adjustedBankBalance - adjustedLedgerBalance;

    return {
      statementClosingBalance: stmtClosing,
      depositsInTransit,
      outstandingCheques,
      adjustedBankBalance,
      ledgerClosingBalance: ledgerClosing,
      ledgerAdjustments,
      adjustedLedgerBalance,
      difference
    };
  };

  const summary = computeReconciliationSummary();

  // Save draft or finalize Completed status
  const handleSaveWorkspace = async (isComplete: boolean) => {
    if (!activeRecId) return;

    if (isComplete && Math.abs(summary.difference) > 0.01) {
      alert("The reconciliation difference must be exactly zero to finalize.");
      return;
    }

    const updatedData: Partial<ReconciliationRecord> = {
      statementRows,
      adjustments,
      summary,
      status: isComplete ? ("Completed" as const) : ("Draft" as const),
      completedDate: isComplete ? new Date().toISOString() : undefined,
      preparedBy,
      notes
    };

    try {
      await updateReconciliation(activeRecId, updatedData);
      alert(isComplete ? "Reconciliation finalized successfully!" : "Draft progress saved.");

      if (isComplete) {
        // Set the completed record to state and open professional report
        const fullRec: ReconciliationRecord = {
          id: activeRecId,
          userId: "personal_workspace",
          accountId: selectedAccountId,
          accountName: activeAccount?.name || "Unknown Account",
          startDate,
          endDate,
          openingBalance,
          closingBalance,
          statementFileName: fileName,
          statementFileSize: fileSize,
          ...updatedData
        } as ReconciliationRecord;

        setReportRec(fullRec);
        setView("report");
      } else {
        setView("history");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save reconciliation changes in Firestore.");
    }
  };

  // Report Actions: PDF / Print & Excel CSV export
  const triggerPrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportRec) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "BANK RECONCILIATION STATEMENT\n";
    csvContent += `Account Name,${reportRec.accountName}\n`;
    csvContent += `Period,${reportRec.startDate} to ${reportRec.endDate}\n`;
    csvContent += `Reconciliation Date,${new Date(reportRec.completedDate || reportRec.createdDate).toLocaleDateString()}\n`;
    csvContent += `Statement File,${reportRec.statementFileName || "Manual Input"}\n`;
    csvContent += `Prepared By,${reportRec.preparedBy || "Workspace User"}\n\n`;

    csvContent += "RECONCILIATION SUMMARY\n";
    csvContent += "Item,Amount (BDT)\n";
    csvContent += `Statement Closing Balance,${reportRec.summary.statementClosingBalance}\n`;
    csvContent += `Add: Deposits in Transit,${reportRec.summary.depositsInTransit}\n`;
    csvContent += `Less: Outstanding Cheques,-${reportRec.summary.outstandingCheques}\n`;
    csvContent += `Adjusted Bank Balance,${reportRec.summary.adjustedBankBalance}\n`;
    csvContent += `Ledger Closing Balance,${reportRec.summary.ledgerClosingBalance}\n`;
    csvContent += `Ledger Adjustments,${reportRec.summary.ledgerAdjustments}\n`;
    csvContent += `Adjusted Ledger Balance,${reportRec.summary.adjustedLedgerBalance}\n`;
    csvContent += `Difference,${reportRec.summary.difference}\n\n`;

    // Add adjustments checklist
    csvContent += "RECONCILIATION ADJUSTMENTS DETAILS\n";
    csvContent += "Date,Type,Description,Reference,Amount\n";
    reportRec.adjustments.forEach((adj) => {
      csvContent += `${adj.date},${adj.type},"${adj.description.replace(/"/g, '""')}",${adj.referenceNumber || ""},${adj.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bank_Reconciliation_${reportRec.accountName}_${reportRec.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-800 tracking-tight">Bank Reconciliation Workspace</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Validate general ledger records against uploaded bank statements</p>
        </div>
        <div className="mt-3 sm:mt-0 flex space-x-2">
          {view !== "history" && (
            <button
              onClick={() => setView("history")}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
            >
              <BookOpen className="h-4 w-4 mr-1.5 text-slate-400" />
              History Logs
            </button>
          )}
          {view === "history" && (
            <button
              onClick={() => {
                resetSetup();
                setView("setup");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Reconciliation
            </button>
          )}
        </div>
      </div>

      {/* ==================== VIEW 1: HISTORY LOGS ==================== */}
      {view === "history" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Reconciliation History</h3>
                <p className="text-xs text-slate-400 mt-1">Review saved drafts or print previous verified bank reconciliations</p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full font-semibold">
                {reconciliations.length} Total records
              </span>
            </div>

            {reconciliations.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-semibold">No reconciliation records found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Get started by selecting a bank account, uploading a statement, and resolving ledger offsets.
                </p>
                <button
                  onClick={() => setView("setup")}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                >
                  Start New Reconciliation
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="p-4">Bank Account</th>
                      <th className="p-4">Statement Period</th>
                      <th className="p-4">Closing Balance</th>
                      <th className="p-4">Variance</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="p-4 font-semibold text-slate-800">{rec.accountName}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1 font-mono text-slate-600">
                            <span>{rec.startDate}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span>{rec.endDate}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-semibold">{formatCurrency(rec.closingBalance)}</td>
                        <td className="p-4">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                              Math.abs(rec.summary?.difference || 0) < 0.01
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {formatCurrency(rec.summary?.difference || 0)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              rec.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end space-x-2">
                          <button
                            onClick={() => handleReopenRecord(rec)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center transition cursor-pointer"
                          >
                            {rec.status === "Completed" ? "View Report" : "Reopen Draft"}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to permanently delete this reconciliation log?")) {
                                await deleteReconciliation(rec.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 transition rounded hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: RECONCILIATION SETUP ==================== */}
      {view === "setup" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Setup controls */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <Settings className="h-4 w-4 mr-2 text-blue-500" />
              Reconciliation Details
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Bank Ledger Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose Account --</option>
                  {accounts
                    .filter((acc) => acc.type === "Bank account" || acc.type === "Custom account" || acc.type === "Credit card")
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Statement Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Statement End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Balance</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-xs">৳</span>
                    <input
                      type="number"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs pl-6 pr-2 py-2 rounded-lg border border-slate-200 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Closing Balance</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-xs">৳</span>
                    <input
                      type="number"
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs pl-6 pr-2 py-2 rounded-lg border border-slate-200 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start space-x-3 text-xs text-slate-600">
              <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Double-entry Auto Validation</p>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  The system will automatically find ledger transaction candidate suggestions within your selected date ranges.
                </p>
              </div>
            </div>
          </div>

          {/* Statement File Upload */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center mb-1">
                <Upload className="h-4 w-4 mr-2 text-blue-500" />
                Upload Bank Statement Document
              </h3>
              <p className="text-xs text-slate-400">PDFs, CSV spreadsheets, Excel worksheets, or direct images of printed statement layouts are supported.</p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition ${
                isUploading
                  ? "border-blue-400 bg-blue-50/20"
                  : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
              }`}
            >
              {isUploading ? (
                <div className="space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Analyzing Document with Gemini AI...</p>
                  <p className="text-[10px] text-slate-400">Reading transaction tables, mapping values, and running duplicate filters.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-full mx-auto w-fit border border-blue-100">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Drag & drop your statement document here</p>
                  <p className="text-[10px] text-slate-400">or click to browse your desktop files</p>
                  <input
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="statement-file-input"
                  />
                  <label
                    htmlFor="statement-file-input"
                    className="mt-3 inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold border border-slate-200 cursor-pointer"
                  >
                    Select Statement File
                  </label>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-center space-x-2 text-xs text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">Gemini 3.5 Flash Model Powered parsing</span>
              <button
                disabled={!selectedAccountId || isUploading}
                onClick={() => {
                  // Bypass upload, start manual statement building
                  setReviewRows([]);
                  setReviewOpening(openingBalance);
                  setReviewClosing(closingBalance);
                  setView("review");
                }}
                className={`text-xs font-bold flex items-center ${
                  !selectedAccountId
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-blue-600 hover:text-blue-800 cursor-pointer"
                }`}
              >
                Or manually key statement rows
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 3: REVIEW BEFORE IMPORT ==================== */}
      {view === "review" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Review Extracted Bank Statement Rows</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify date strings, debit/credit distributions, and remove any duplicates before importing into the audit room.
              </p>
              {fileName && (
                <div className="mt-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 w-fit font-mono">
                  File: {fileName} ({(fileSize / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAddReviewRow}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1 text-slate-500" /> Add Row
              </button>
              <button
                onClick={handleConfirmImport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-sm cursor-pointer"
              >
                <Check className="h-4 w-4 mr-1.5" /> Confirm and Import
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
              <div>
                <span className="text-slate-400 block mb-0.5">Opening Balance</span>
                <input
                  type="number"
                  value={reviewOpening}
                  onChange={(e) => setReviewOpening(parseFloat(e.target.value) || 0)}
                  className="bg-white border border-slate-200 p-1 rounded w-full font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Closing Balance</span>
                <input
                  type="number"
                  value={reviewClosing}
                  onChange={(e) => setReviewClosing(parseFloat(e.target.value) || 0)}
                  className="bg-white border border-slate-200 p-1 rounded w-full font-mono font-bold"
                />
              </div>
              <div className="md:col-span-2 text-right flex flex-col justify-end">
                <span className="text-slate-500 font-mono text-[11px] block">
                  Net Statement Shift: <strong className="text-slate-800">{(reviewClosing - reviewOpening).toFixed(2)} ৳</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="p-3 w-32">Date</th>
                    <th className="p-3">Particulars / Description</th>
                    <th className="p-3 w-32">Reference / Cheque</th>
                    <th className="p-3 w-28">Debit (Out)</th>
                    <th className="p-3 w-28">Credit (In)</th>
                    <th className="p-3 w-28">Running Bal</th>
                    <th className="p-3 text-center w-12">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No rows added. Click "Add Row" to build manually.
                      </td>
                    </tr>
                  ) : (
                    reviewRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 ${
                          row.status === "Duplicate" ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateReviewRow(row.id, "date", e.target.value)}
                            className="border border-slate-200 rounded p-1 w-full font-mono text-[11px] bg-transparent"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleUpdateReviewRow(row.id, "description", e.target.value)}
                            className="border border-slate-200 rounded p-1 w-full bg-transparent"
                            placeholder="Description"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.referenceNumber}
                            onChange={(e) => handleUpdateReviewRow(row.id, "referenceNumber", e.target.value)}
                            className="border border-slate-200 rounded p-1 w-full bg-transparent font-mono"
                            placeholder="Ref / Chq"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.debit || ""}
                            onChange={(e) => handleUpdateReviewRow(row.id, "debit", parseFloat(e.target.value) || 0)}
                            className="border border-slate-200 rounded p-1 w-full bg-transparent text-right font-mono text-red-600"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.credit || ""}
                            onChange={(e) => handleUpdateReviewRow(row.id, "credit", parseFloat(e.target.value) || 0)}
                            className="border border-slate-200 rounded p-1 w-full bg-transparent text-right font-mono text-emerald-600"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.runningBalance || ""}
                            onChange={(e) => handleUpdateReviewRow(row.id, "runningBalance", parseFloat(e.target.value) || 0)}
                            className="border border-slate-200 rounded p-1 w-full bg-transparent text-right font-mono"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteReviewRow(row.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 4: MATCHING WORKSPACE ==================== */}
      {view === "workspace" && (
        <div className="space-y-6">
          {/* Workspace Quick Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Statement Closing Bal</span>
              <span className="text-base font-bold font-mono text-slate-800">{formatCurrency(closingBalance)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Adjusted Bank Balance</span>
              <span className="text-base font-bold font-mono text-blue-600">{formatCurrency(summary.adjustedBankBalance)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Adjusted Ledger Balance</span>
              <span className="text-base font-bold font-mono text-teal-600">{formatCurrency(summary.adjustedLedgerBalance)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Difference Variance</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className={`text-base font-extrabold font-mono px-2 py-0.5 rounded ${
                    Math.abs(summary.difference) < 0.01 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {formatCurrency(summary.difference)}
                </span>
                {Math.abs(summary.difference) < 0.01 && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Bank Statement list */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Bank Statement Items</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select a row to inspect potential ledger matching pairs</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setIsMultiMatching(!isMultiMatching)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border transition ${
                        isMultiMatching
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      {isMultiMatching ? "Cancel Multi-Select" : "Match Multiple Rows"}
                    </button>
                    {isMultiMatching && selectedMultiRowIds.length >= 2 && (
                      <button
                        onClick={handleOpenMultiMatch}
                        className="bg-blue-600 text-white px-2 py-1 text-[10px] font-bold rounded hover:bg-blue-700"
                      >
                        Pair ({selectedMultiRowIds.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                  {statementRows.map((row) => {
                    const isSelected = selectedStatementRowId === row.id;
                    const isMultiSelected = selectedMultiRowIds.includes(row.id);
                    const amount = row.debit > 0 ? row.debit : row.credit;

                    return (
                      <div
                        key={row.id}
                        onClick={() => {
                          if (isMultiMatching) {
                            if (isMultiSelected) {
                              setSelectedMultiRowIds(selectedMultiRowIds.filter((id) => id !== row.id));
                            } else {
                              setSelectedMultiRowIds([...selectedMultiRowIds, row.id]);
                            }
                          } else {
                            setSelectedStatementRowId(row.id);
                          }
                        }}
                        className={`p-3 transition cursor-pointer flex items-center justify-between hover:bg-slate-50/50 ${
                          isSelected ? "bg-blue-50/40 border-l-4 border-blue-600" : ""
                        } ${isMultiSelected ? "bg-blue-50/20" : ""}`}
                      >
                        <div className="space-y-1 pr-3 flex-1">
                          <div className="flex items-center space-x-1.5">
                            {isMultiMatching && (
                              <input
                                type="checkbox"
                                checked={isMultiSelected}
                                readOnly
                                className="mr-1.5 h-3.5 w-3.5 text-blue-600 border-slate-300 rounded"
                              />
                            )}
                            <span className="text-[11px] font-mono text-slate-500">{row.date}</span>
                            {row.referenceNumber && (
                              <span className="text-[9px] font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-500">
                                Ref: {row.referenceNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[240px]" title={row.description}>
                            {row.description}
                          </p>
                          {row.auditTrail && row.auditTrail.length > 0 && (
                            <span className="text-[9px] font-mono text-amber-600 block">Edited Row</span>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end space-y-1">
                          <span className={`text-xs font-bold font-mono ${row.debit > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {row.debit > 0 ? "-" : "+"} {formatCurrency(amount)}
                          </span>

                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              row.status === "Matched" || row.status === "Manually Matched"
                                ? "bg-emerald-50 text-emerald-700"
                                : row.status === "Suggested Match"
                                ? "bg-amber-50 text-amber-700 animate-pulse"
                                : row.status === "Duplicate"
                                ? "bg-slate-100 text-slate-400"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Ledger inspection, matching & adjustments */}
            <div className="lg:col-span-6 space-y-4">
              {/* Contextual Matching inspector */}
              {selectedStatementRowId ? (
                (() => {
                  const sRow = statementRows.find((r) => r.id === selectedStatementRowId);
                  if (!sRow) return null;
                  const amt = sRow.debit > 0 ? sRow.debit : sRow.credit;

                  return (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inspect Selection</h4>
                          <span className="text-xs font-semibold text-slate-700 block mt-1">{sRow.description}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold font-mono ${sRow.debit > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {sRow.debit > 0 ? "-" : "+"} {formatCurrency(amt)}
                          </span>
                        </div>
                      </div>

                      {/* Matching statuses and helper buttons */}
                      <div className="space-y-3">
                        {sRow.status === "Suggested Match" && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />
                              <span className="text-amber-800 font-semibold">Gemini Suggested Ledger Match Found</span>
                            </div>
                            <button
                              onClick={() => handleAcceptSuggestedMatch(sRow.id)}
                              className="bg-amber-600 text-white px-2.5 py-1 rounded font-bold hover:bg-amber-700"
                            >
                              Accept suggestion
                            </button>
                          </div>
                        )}

                        {(sRow.status === "Matched" || sRow.status === "Manually Matched") && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                            <span className="text-emerald-800 font-semibold">Fully Reconciled with Ledger Transaction</span>
                            <button
                              onClick={() => handleUnmatchRow(sRow.id)}
                              className="bg-white border border-emerald-300 text-emerald-800 px-2 py-1 rounded font-semibold hover:bg-emerald-100"
                            >
                              Unmatch Pair
                            </button>
                          </div>
                        )}

                        {sRow.status === "Unmatched" && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleOpenManualMatch(sRow)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold shadow-sm"
                            >
                              Link Ledger Transaction
                            </button>
                            <button
                              onClick={() => handleOpenQuickLedger(sRow)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded font-bold"
                            >
                              Create Ledger Entry (Bank Charge/Fee)
                            </button>
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleMarkRowStatus(sRow.id, "Duplicate")}
                            className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs px-3 py-1.5 rounded font-medium"
                          >
                            Mark Duplicate
                          </button>
                          <button
                            onClick={() => handleMarkRowStatus(sRow.id, "Bank-Only")}
                            className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs px-3 py-1.5 rounded font-medium"
                          >
                            Mark Bank-Only
                          </button>
                          {sRow.status !== "Unmatched" && (
                            <button
                              onClick={() => handleMarkRowStatus(sRow.id, "Unmatched")}
                              className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs px-3 py-1.5 rounded font-medium"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center text-xs text-slate-400">
                  <Info className="h-6 w-6 mx-auto mb-1.5 text-slate-400" />
                  Select a statement row on the left to review ledger matches or add custom adjusting journals.
                </div>
              )}

              {/* Outstanding/Adjustments manager */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Reconciliation Adjustments</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manage transit deposits, outstanding cheques, and charges</p>
                  </div>
                  <button
                    onClick={() => setShowAdjForm(!showAdjForm)}
                    className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 text-[10px] px-2 py-1 rounded font-bold flex items-center"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Adjustment
                  </button>
                </div>

                {/* Adjustment entry form */}
                {showAdjForm && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Adjustment Type</label>
                        <select
                          value={adjType}
                          onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
                          className="bg-white border p-1 rounded w-full"
                        >
                          <option value="Outstanding Cheque">Outstanding Cheque</option>
                          <option value="Deposit in Transit">Deposit in Transit</option>
                          <option value="Bank Charge">Bank Charge</option>
                          <option value="Bank Interest">Bank Interest</option>
                          <option value="Direct Debit">Direct Debit</option>
                          <option value="Standing Order">Standing Order</option>
                          <option value="Returned Cheque">Returned Cheque</option>
                          <option value="Other Adjustment">Other Adjustment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Date</label>
                        <input
                          type="date"
                          value={adjDate}
                          onChange={(e) => setAdjDate(e.target.value)}
                          className="bg-white border p-1 rounded w-full font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Description</label>
                        <input
                          type="text"
                          value={adjDesc}
                          onChange={(e) => setAdjDesc(e.target.value)}
                          className="bg-white border p-1 rounded w-full"
                          placeholder="Particular details"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Amount (৳)</label>
                        <input
                          type="number"
                          value={adjAmount || ""}
                          onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                          className="bg-white border p-1 rounded w-full font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Cheque/Ref Number (Optional)</label>
                      <input
                        type="text"
                        value={adjRef}
                        onChange={(e) => setAdjRef(e.target.value)}
                        className="bg-white border p-1 rounded w-full font-mono"
                        placeholder="Ref #"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setShowAdjForm(false)}
                        className="bg-white border p-1 px-2 rounded hover:bg-slate-100 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddAdjustment}
                        className="bg-blue-600 text-white p-1 px-2.5 rounded hover:bg-blue-700 font-bold"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                )}

                {/* Adjustments checklist */}
                <div className="space-y-2">
                  {adjustments.length === 0 ? (
                    <div className="text-center p-4 text-slate-400 text-xs">
                      No adjustments added yet. Click "Add Adjustment" or add transit cheques.
                    </div>
                  ) : (
                    adjustments.map((adj) => (
                      <div key={adj.id} className="p-2.5 rounded border border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[9px] bg-slate-200 px-1 rounded text-slate-600">{adj.date}</span>
                            <span className="font-bold text-slate-800">{adj.type}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">{adj.description}</span>
                          {adj.referenceNumber && (
                            <span className="text-[9px] font-mono text-slate-400 block">Ref: {adj.referenceNumber}</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-right">
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(adj.amount)}</span>
                          
                          {/* Create ledger quick action for adjusting rows */}
                          {(adj.type === "Bank Charge" || adj.type === "Bank Interest" || adj.type === "Direct Debit") && (
                            <button
                              disabled={adj.isLedgerCreated}
                              onClick={() => handleOpenQuickLedgerFromAdj(adj)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                adj.isLedgerCreated
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                              }`}
                            >
                              {adj.isLedgerCreated ? "Ledger OK" : "+ Ledger Entry"}
                            </button>
                          )}

                          <button onClick={() => handleDeleteAdjustment(adj.id)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom actions & Audit details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Workspace Audit trail & notes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Prepared By</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                  placeholder="Your Name / Auditor ID"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Notes / Explanations</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none h-10"
                  placeholder="Explain any recording errors or adjusting variances."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleSaveWorkspace(false)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
              >
                Save Draft Progress
              </button>
              <button
                disabled={Math.abs(summary.difference) > 0.01}
                onClick={() => handleSaveWorkspace(true)}
                className={`px-5 py-2 rounded-lg text-xs font-bold shadow-sm ${
                  Math.abs(summary.difference) > 0.01
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                }`}
              >
                Finalize Reconciliation (Difference ৳0)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 5: PRINTABLE REPORT VIEW ==================== */}
      {view === "report" && reportRec && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center print:hidden">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Verified Reconciliation Statement</h3>
              <p className="text-xs text-slate-400">Lock status: Reconciled & Saved securely in Firestore.</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleExportCSV}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" /> Export Excel
              </button>
              <button
                onClick={triggerPrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4 mr-1" /> Printable A4 Layout
              </button>
            </div>
          </div>

          {/* Printable Layout Wrapper */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-md font-sans max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-full">
            {/* Report Header */}
            <div className="border-b-2 border-slate-800 pb-5 text-center">
              <h1 className="text-2xl font-black uppercase text-slate-900 tracking-wider">Bank Reconciliation Statement</h1>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">Audit Ledger & Bank Offset Validation</p>

              <div className="grid grid-cols-2 gap-4 mt-6 text-left text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Account Name</span>
                  <span className="text-slate-800 font-bold text-sm">{reportRec.accountName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Statement Period</span>
                  <span className="text-slate-800 font-bold font-mono">
                    {reportRec.startDate} to {reportRec.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Reconciliation Date</span>
                  <span className="text-slate-800 font-bold font-mono">
                    {new Date(reportRec.completedDate || reportRec.createdDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Prepared By</span>
                  <span className="text-slate-800 font-bold">{reportRec.preparedBy || "Workspace Auditor"}</span>
                </div>
              </div>
            </div>

            {/* Reconciliation Statement Formula Block */}
            <div className="mt-8 space-y-6">
              {/* Bank side */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">1. Balance per Bank Statement</h3>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex justify-between font-bold">
                    <span>Balance as per Bank Statement (Closing)</span>
                    <span className="font-mono">{formatCurrency(reportRec.summary.statementClosingBalance)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-slate-600 pl-4">
                    <span>Add: Deposits in Transit</span>
                    <span className="font-mono">+{formatCurrency(reportRec.summary.depositsInTransit)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-slate-600 pl-4">
                    <span>Less: Outstanding Cheques</span>
                    <span className="font-mono">-{formatCurrency(reportRec.summary.outstandingCheques)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between font-black text-blue-800 border-t border-slate-300">
                    <span>Adjusted Bank Balance</span>
                    <span className="font-mono">{formatCurrency(reportRec.summary.adjustedBankBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Ledger side */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">2. Balance per General Ledger Books</h3>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex justify-between font-bold">
                    <span>Balance as per General Ledger (Closing)</span>
                    <span className="font-mono">{formatCurrency(reportRec.summary.ledgerClosingBalance)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-slate-600 pl-4">
                    <span>Add/Less Adjustments (Charges/Interest etc)</span>
                    <span className="font-mono">
                      {reportRec.summary.ledgerAdjustments >= 0 ? "+" : "-"} {formatCurrency(Math.abs(reportRec.summary.ledgerAdjustments))}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between font-black text-teal-800 border-t border-slate-300">
                    <span>Adjusted General Ledger Balance</span>
                    <span className="font-mono">{formatCurrency(reportRec.summary.adjustedLedgerBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Variance checking */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Reconciliation Difference Variance is exactly ZERO. Ledger books completely aligned.</span>
                </div>
                <span className="font-mono font-bold text-emerald-900">৳0.00</span>
              </div>
            </div>

            {/* Reconciliation Adjustment Details section */}
            {reportRec.adjustments && reportRec.adjustments.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-3">
                  Reconciliation Adjusting Items Checklist
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2 text-right">Amount (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportRec.adjustments.map((adj) => (
                      <tr key={adj.id}>
                        <td className="p-2 font-mono">{adj.date}</td>
                        <td className="p-2 font-bold">{adj.type}</td>
                        <td className="p-2 text-slate-500">{adj.description}</td>
                        <td className="p-2 font-mono">{adj.referenceNumber || "-"}</td>
                        <td className="p-2 text-right font-mono font-semibold">{formatCurrency(adj.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes Section */}
            {reportRec.notes && (
              <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Auditor Explanations / Notes</span>
                <p className="text-slate-500 leading-relaxed">{reportRec.notes}</p>
              </div>
            )}

            {/* Signature fields */}
            <div className="mt-12 pt-10 border-t border-dashed border-slate-300 grid grid-cols-2 gap-10 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 h-10 w-48 mx-auto"></div>
                <span className="text-slate-500 block mt-1.5 font-bold">{reportRec.preparedBy || "Auditor Signature"}</span>
                <span className="text-[10px] text-slate-400">Date: {new Date(reportRec.completedDate || reportRec.createdDate).toLocaleDateString()}</span>
              </div>
              <div>
                <div className="border-b border-slate-400 h-10 w-48 mx-auto"></div>
                <span className="text-slate-500 block mt-1.5 font-bold">Approved By / Finance Director</span>
                <span className="text-[10px] text-slate-400">Date: ________________________</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== INTERACTIVE DIALOGS / MODALS ==================== */}

      {/* Modal 1: Link Ledger Transaction (Manual Match) */}
      {showMatchModal && matchRow && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Manual Match Ledger Record</h3>
                <p className="text-xs text-slate-400 mt-1">Select one or multiple ledger records whose sum corresponds to this bank row.</p>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold block text-slate-800">{matchRow.description}</span>
                <span className="font-mono text-slate-400">Date: {matchRow.date}</span>
              </div>
              <span className={`text-sm font-extrabold font-mono ${matchRow.debit > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {matchRow.debit > 0 ? "-" : "+"} {formatCurrency(matchRow.debit > 0 ? matchRow.debit : matchRow.credit)}
              </span>
            </div>

            {/* Search filter */}
            <div className="p-3 border-b border-slate-100 relative">
              <Search className="absolute left-6 top-5.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search description, reference, category..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            {/* List candidate ledger transactions */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {periodLedgerTransactions
                .filter((tx) => {
                  if (ledgerSearch) {
                    const search = ledgerSearch.toLowerCase();
                    return (
                      tx.description.toLowerCase().includes(search) ||
                      (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(search)) ||
                      tx.category.toLowerCase().includes(search)
                    );
                  }
                  return true;
                })
                .map((tx) => {
                  const isChecked = matchSelectedLedgerIds.includes(tx.id);
                  const isSameDirection = matchRow.debit > 0
                    ? tx.type === "Expense" || (tx.type === "Transfer" && tx.account === selectedAccountId)
                    : tx.type === "Income" || (tx.type === "Transfer" && tx.toAccount === selectedAccountId);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (isChecked) {
                          setMatchSelectedLedgerIds(matchSelectedLedgerIds.filter((id) => id !== tx.id));
                        } else {
                          setMatchSelectedLedgerIds([...matchSelectedLedgerIds, tx.id]);
                        }
                      }}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                        isChecked ? "bg-blue-50 border-blue-300" : "border-slate-100 hover:bg-slate-50"
                      } ${!isSameDirection ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center space-x-3">
                        <input type="checkbox" checked={isChecked} readOnly className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-slate-400">{tx.date}</span>
                            <span className="font-bold text-xs text-slate-800">{tx.category}</span>
                            {!isSameDirection && (
                              <span className="text-[8px] bg-amber-50 text-amber-700 px-1 rounded">Direction Mismatch</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{tx.description}</p>
                          {tx.referenceNumber && (
                            <span className="text-[9px] font-mono text-slate-400">Ref: {tx.referenceNumber}</span>
                          )}
                        </div>
                      </div>
                      <span className={`font-mono text-xs font-bold ${tx.type === "Expense" ? "text-red-500" : "text-emerald-500"}`}>
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Sum Indicator */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block">Selected Sum Total</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatCurrency(
                    transactions
                      .filter((tx) => matchSelectedLedgerIds.includes(tx.id))
                      .reduce((sum, tx) => sum + Number(tx.amount), 0)
                  )}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmManualMatch}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold hover:bg-blue-700"
                >
                  Confirm Match Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Match Multiple Statement rows to ONE Ledger Transaction */}
      {showMultiMatchModal && selectedMultiRowIds.length >= 2 && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Match Multiple Rows to One Ledger Entry</h3>
              <button onClick={() => setShowMultiMatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs">
              <span className="text-slate-500 block mb-1">Combining the following Bank Statement Rows:</span>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {statementRows
                  .filter((row) => selectedMultiRowIds.includes(row.id))
                  .map((row) => (
                    <div key={row.id} className="flex justify-between items-center text-[11px] font-mono">
                      <span>{row.description}</span>
                      <span className="font-semibold">
                        {formatCurrency(row.debit > 0 ? row.debit : row.credit)}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="mt-2 text-right text-xs">
                <span className="text-slate-400">Total Sum: </span>
                <span className="font-extrabold font-mono">
                  {formatCurrency(
                    statementRows
                      .filter((row) => selectedMultiRowIds.includes(row.id))
                      .reduce((sum, row) => sum + (row.debit > 0 ? row.debit : row.credit), 0)
                  )}
                </span>
              </div>
            </div>

            {/* List candidate ledger transactions */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Ledger Transaction Candidate</span>
              {periodLedgerTransactions.map((tx) => {
                const isSelected = multiSelectedLedgerId === tx.id;
                return (
                  <div
                    key={tx.id}
                    onClick={() => setMultiSelectedLedgerId(tx.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      isSelected ? "bg-blue-50 border-blue-300" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] text-slate-400">{tx.date}</span>
                        <span className="font-bold text-xs text-slate-800">{tx.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{tx.description}</p>
                    </div>
                    <span className="font-mono text-xs font-bold">{formatCurrency(tx.amount)}</span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setShowMultiMatchModal(false)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded font-semibold text-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!multiSelectedLedgerId}
                onClick={handleConfirmMultiMatch}
                className={`px-4 py-1.5 rounded font-bold text-xs ${
                  !multiSelectedLedgerId
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                Link Multiple to One
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Quick General Ledger Entry Form */}
      {(quickLedgerRow || quickLedgerAdj) && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Record Adjusting Ledger Entry</h3>
              <button onClick={() => {
                setQuickLedgerRow(null);
                setQuickLedgerAdj(null);
              }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Target Account</label>
                <div className="font-bold text-slate-800 p-2 bg-slate-50 rounded border">
                  {activeAccount?.name || "Selected Bank Account"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Date</label>
                  <div className="p-2 bg-slate-50 rounded border font-mono">
                    {quickLedgerRow ? quickLedgerRow.date : quickLedgerAdj?.date}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Amount</label>
                  <div className="p-2 bg-slate-50 rounded border font-mono font-bold text-slate-800">
                    {formatCurrency(
                      quickLedgerRow
                        ? quickLedgerRow.debit > 0
                          ? quickLedgerRow.debit
                          : quickLedgerRow.credit
                        : quickLedgerAdj?.amount || 0
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Ledger Category</label>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="w-full p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Office expense">Bank Charges / Fees (Expense)</option>
                  <option value="Interest income">Bank Interest (Income)</option>
                  <option value="Utility bills">Utility bills (Expense)</option>
                  <option value="Rent">Rent (Expense)</option>
                  <option value="Other expense">Other adjustments (Expense)</option>
                  <option value="Other income">Other adjustments (Income)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Ledger Description</label>
                <input
                  type="text"
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  className="w-full p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Record description"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setQuickLedgerRow(null);
                  setQuickLedgerAdj(null);
                }}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded font-semibold text-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuickLedger}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold text-xs"
              >
                Post Ledger Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
