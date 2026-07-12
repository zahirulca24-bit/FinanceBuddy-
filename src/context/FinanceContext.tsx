import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../supabase";
import { Account, Transaction, Category, TransactionType, AccountType, ReconciliationRecord, DebtDetail } from "../types";
import { DEFAULT_ACCOUNTS, DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "../lib/defaults";

interface FinanceContextType {
  user: any;
  loading: boolean;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  isDemoUser: boolean;
  reconciliations: ReconciliationRecord[];
  categoryBudgets: Record<string, number>;
  debtDetails: DebtDetail[];
  deletedAccounts: Account[];
  deletedTransactions: Transaction[];
  
  // Real-time Calculations
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  monthlySavings: number;
  receivables: number;
  payables: number;
  
  // Database Operations
  addTransaction: (tx: Omit<Transaction, "id" | "userId" | "createdAt">) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  restoreTransaction: (id: string) => Promise<void>;
  
  addAccount: (name: string, type: AccountType, initialBalance: number, targetGoal?: number) => Promise<void>;
  updateAccount: (id: string, name: string, type: AccountType, initialBalance: number, targetGoal?: number) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  restoreAccount: (id: string) => Promise<void>;
  
  addCategory: (name: string, type: "Income" | "Expense") => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  addReconciliation: (rec: Omit<ReconciliationRecord, "id" | "userId" | "createdDate">) => Promise<string>;
  updateReconciliation: (id: string, rec: Partial<ReconciliationRecord>) => Promise<void>;
  deleteReconciliation: (id: string) => Promise<void>;
  
  updateCategoryBudget: (categoryName: string, amount: number) => Promise<void>;
  
  updateDebtDetail: (accountId: string, detail: Partial<DebtDetail>) => Promise<void>;
  
  seedDefaults: () => Promise<void>;
  clearAllData: () => Promise<void>;
  reloadData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within a FinanceProvider");
  return context;
};

// --- MAPPING HELPERS FOR SUPABASE ---

const mapAccountFromDb = (row: any): Account => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  type: row.type as AccountType,
  initialBalance: Number(row.initial_balance) || 0,
  targetGoal: row.target_goal ? Number(row.target_goal) : undefined,
  createdAt: row.created_at
});

const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  userId: row.user_id,
  date: row.date,
  type: row.type as TransactionType,
  account: row.account,
  toAccount: row.to_account || undefined,
  category: row.category,
  description: row.description,
  amount: Number(row.amount) || 0,
  paymentMethod: row.payment_method || undefined,
  referenceNumber: row.reference_number || undefined,
  notes: row.notes || undefined,
  isReceivable: !!row.is_receivable,
  isPayable: !!row.is_payable,
  isCleared: !!row.is_cleared,
  createdAt: row.created_at
});

const mapCategoryFromDb = (row: any): Category => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  type: row.type as "Income" | "Expense",
  isDefault: !!row.is_default
});

const mapReconciliationFromDb = (row: any): ReconciliationRecord => ({
  id: row.id,
  userId: row.user_id,
  accountId: row.account_id,
  accountName: row.account_name,
  startDate: row.start_date,
  endDate: row.end_date,
  openingBalance: Number(row.opening_balance) || 0,
  closingBalance: Number(row.closing_balance) || 0,
  status: row.status as "Draft" | "Completed",
  createdDate: row.created_date,
  completedDate: row.completed_date || undefined,
  statementFileName: row.statement_file_name || undefined,
  statementFileSize: row.statement_file_size ? Number(row.statement_file_size) : undefined,
  statementRows: Array.isArray(row.statement_rows) ? row.statement_rows : [],
  adjustments: Array.isArray(row.adjustments) ? row.adjustments : [],
  summary: typeof row.summary === "object" && row.summary ? row.summary : {
    statementClosingBalance: 0,
    depositsInTransit: 0,
    outstandingCheques: 0,
    adjustedBankBalance: 0,
    ledgerClosingBalance: 0,
    ledgerAdjustments: 0,
    adjustedLedgerBalance: 0,
    difference: 0
  },
  preparedBy: row.prepared_by,
  notes: row.notes || undefined
});

// --- PROVIDER ---

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(() => {
    const saved = sessionStorage.getItem("preview-user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deletedAccounts, setDeletedAccounts] = useState<Account[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [debtDetails, setDebtDetails] = useState<DebtDetail[]>([]);
  const [isDemoUser] = useState(false);
  
  const isSavingRef = useRef(false);

  const logAuditEvent = async (action: string, table: string, recordId: string, oldValue: any, newValue: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action, table, recordId, oldValue, newValue })
      });
    } catch (err) {
      console.error("Failed to log audit event:", err);
    }
  };

  const withSaveLock = async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (isSavingRef.current) throw new Error("A save operation is already in progress. Please wait.");
    isSavingRef.current = true;
    try {
      return await operation();
    } finally {
      isSavingRef.current = false;
    }
  };

  const staticCategories: Category[] = [
    ...DEFAULT_INCOME_CATEGORIES.map((cat, idx) => ({
      id: `static-inc-${idx}`,
      userId: user?.id || "personal_workspace",
      name: cat,
      type: "Income" as const,
      isDefault: true
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((cat, idx) => ({
      id: `static-exp-${idx}`,
      userId: user?.id || "personal_workspace",
      name: cat,
      type: "Expense" as const,
      isDefault: true
    }))
  ];

  const categories = [
    ...staticCategories,
    ...dbCategories
  ];

  // Auth session state listener
  useEffect(() => {
    const savedPreview = sessionStorage.getItem("preview-user");
    if (savedPreview) {
      try {
        const parsed = JSON.parse(savedPreview);
        setUser(parsed);
        setLoading(false);
        return;
      } catch (_) {}
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isPreview = sessionStorage.getItem("preview-user");
      if (isPreview) return;

      setUser(session?.user ?? null);
      if (!session) {
        // Clear local state on logout
        setAccounts([]);
        setTransactions([]);
        setDbCategories([]);
        setReconciliations([]);
        setCategoryBudgets({});
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch all user ledger data from Supabase
  const reloadData = async () => {
    if (!user) return;

    try {
      // 1. Fetch Accounts
      const { data: accountsData, error: accError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);
      
      if (accError) throw accError;
      
      const activeAccountsRaw = (accountsData || []).filter((r: any) => !r.is_deleted);
      const deletedAccountsRaw = (accountsData || []).filter((r: any) => !!r.is_deleted);
      
      setAccounts(activeAccountsRaw.map(mapAccountFromDb));
      setDeletedAccounts(deletedAccountsRaw.map(mapAccountFromDb));

      // 2. Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);

      if (txError) throw txError;
      
      const activeTxRaw = (txData || []).filter((r: any) => !r.is_deleted);
      const deletedTxRaw = (txData || []).filter((r: any) => !!r.is_deleted);
      
      const mappedTx = activeTxRaw.map(mapTransactionFromDb);
      // Sort descending
      mappedTx.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      setTransactions(mappedTx);
      
      const mappedDeletedTx = deletedTxRaw.map(mapTransactionFromDb);
      mappedDeletedTx.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      setDeletedTransactions(mappedDeletedTx);

      // 3. Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id);

      if (catError) throw catError;
      const activeCatRaw = (catData || []).filter((r: any) => !r.is_deleted);
      setDbCategories(activeCatRaw.map(mapCategoryFromDb));

      // 4. Fetch Reconciliations
      const { data: recData, error: recError } = await supabase
        .from("bank_reconciliations")
        .select("*")
        .eq("user_id", user.id);

      if (recError) throw recError;
      const activeRecRaw = (recData || []).filter((r: any) => !r.is_deleted);
      const mappedRec = activeRecRaw.map(mapReconciliationFromDb);
      mappedRec.sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
      setReconciliations(mappedRec);

      // 5. Fetch Budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", "all")
        .single();

      if (budgetError && budgetError.code !== "PGRST116") {
        throw budgetError;
      }
      setCategoryBudgets(budgetData?.category_budgets || {});

      // 6. Fetch Debt Details (localStorage for now to avoid manual SQL migrations)
      try {
        const localDebts = localStorage.getItem(`debt_details_${user.id}`);
        if (localDebts) {
          setDebtDetails(JSON.parse(localDebts));
        } else {
          setDebtDetails([]);
        }
      } catch (err) {
        console.error("Error parsing local debts", err);
      }

    } catch (err) {
      console.error("Error fetching financial data from Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync state whenever user switches or logs in
  useEffect(() => {
    if (user) {
      setLoading(true);
      reloadData();
    }
  }, [user]);

  // Seeding Default Values (Not used/no-op)
  const seedDefaults = async () => {};

  // Clear all data
  const clearAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("accounts").delete().eq("user_id", user.id);
      await supabase.from("transactions").delete().eq("user_id", user.id);
      await supabase.from("categories").delete().eq("user_id", user.id);
      await supabase.from("bank_reconciliations").delete().eq("user_id", user.id);
      await supabase.from("budgets").delete().eq("user_id", user.id);
      await reloadData();
    } catch (err) {
      console.error("Failed to clear data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Live balance calculation
  const getAccountBalances = (): Record<string, number> => {
    const balances: Record<string, number> = {};

    accounts.forEach((acc) => {
      balances[acc.id] = acc.initialBalance;
    });

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "Income") {
        if (balances[tx.account] !== undefined) {
          balances[tx.account] += amt;
        }
      } else if (tx.type === "Expense") {
        if (balances[tx.account] !== undefined) {
          balances[tx.account] -= amt;
        }
      } else if (tx.type === "Transfer") {
        if (balances[tx.account] !== undefined) {
          balances[tx.account] -= amt;
        }
        if (tx.toAccount && balances[tx.toAccount] !== undefined) {
          balances[tx.toAccount] += amt;
        }
      }
    });

    return balances;
  };

  const accountBalances = getAccountBalances();

  const currentBalance = Object.values(accountBalances).reduce((sum, bal) => sum + bal, 0);

  const totalIncome = transactions
    .filter((tx) => tx.type === "Income")
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const totalExpenses = transactions
    .filter((tx) => tx.type === "Expense")
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const getMonthlySavings = (): number => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    const monthlyInc = transactions
      .filter((tx) => tx.type === "Income" && tx.date.startsWith(currentYearMonth))
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      
    const monthlyExp = transactions
      .filter((tx) => tx.type === "Expense" && tx.date.startsWith(currentYearMonth))
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    return monthlyInc - monthlyExp;
  };

  const monthlySavings = getMonthlySavings();

  const receivables = transactions
    .filter((tx) => tx.isReceivable === true && tx.isCleared !== true)
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const payables = transactions
    .filter((tx) => tx.isPayable === true && tx.isCleared !== true)
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  // Database Operations - Transactions
  const addTransaction = async (tx: Omit<Transaction, "id" | "userId" | "createdAt">) => {
    if (!user) return;
    return withSaveLock(async () => {
      const txId = "tx_" + Math.random().toString(36).substr(2, 9);

      const { data, error } = await supabase.from("transactions").insert({
        id: txId,
        user_id: user.id,
        date: tx.date,
        type: tx.type,
        account: tx.account,
        to_account: tx.toAccount || null,
        category: tx.category,
        description: tx.description,
        amount: Number(tx.amount) || 0,
        payment_method: tx.paymentMethod || null,
        reference_number: tx.referenceNumber || null,
        notes: tx.notes || null,
        is_receivable: !!tx.isReceivable,
        is_payable: !!tx.isPayable,
        is_cleared: !!tx.isCleared
      }).select().single();

      if (error) throw new Error(`Failed to save transaction: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify transaction after saving.");

      const mapped = mapTransactionFromDb(data);
      await logAuditEvent("CREATE", "transactions", txId, null, mapped);
      await reloadData();
    });
  };

  const updateTransaction = async (id: string, tx: Partial<Transaction>) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = transactions.find(t => t.id === id);
      const updatePayload: any = {};
      if (tx.date !== undefined) updatePayload.date = tx.date;
      if (tx.type !== undefined) updatePayload.type = tx.type;
      if (tx.account !== undefined) updatePayload.account = tx.account;
      if (tx.toAccount !== undefined) updatePayload.to_account = tx.toAccount || null;
      if (tx.category !== undefined) updatePayload.category = tx.category;
      if (tx.description !== undefined) updatePayload.description = tx.description;
      if (tx.amount !== undefined) updatePayload.amount = Number(tx.amount) || 0;
      if (tx.paymentMethod !== undefined) updatePayload.payment_method = tx.paymentMethod || null;
      if (tx.referenceNumber !== undefined) updatePayload.reference_number = tx.referenceNumber || null;
      if (tx.notes !== undefined) updatePayload.notes = tx.notes || null;
      if (tx.isReceivable !== undefined) updatePayload.is_receivable = !!tx.isReceivable;
      if (tx.isPayable !== undefined) updatePayload.is_payable = !!tx.isPayable;
      if (tx.isCleared !== undefined) updatePayload.is_cleared = !!tx.isCleared;

      const { data, error } = await supabase
        .from("transactions")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update transaction: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify transaction after updating.");

      const mapped = mapTransactionFromDb(data);
      await logAuditEvent("UPDATE", "transactions", id, oldVal, mapped);
      await reloadData();
    });
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = transactions.find(t => t.id === id);
      const { error } = await supabase
        .from("transactions")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        if (error.message.includes("column") || error.code === "PGRST204") {
          const { error: hardError } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
          if (hardError) throw new Error(`Failed to delete transaction: ${hardError.message}`);
        } else {
          throw new Error(`Failed to delete transaction: ${error.message}`);
        }
      }

      await logAuditEvent("DELETE", "transactions", id, oldVal, { is_deleted: true });
      await reloadData();
    });
  };

  const restoreTransaction = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const { error } = await supabase
        .from("transactions")
        .update({ is_deleted: false })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(`Failed to restore transaction: ${error.message}`);
      await logAuditEvent("RESTORE", "transactions", id, { is_deleted: true }, { is_deleted: false });
      await reloadData();
    });
  };

  // Database Operations - Accounts
  const addAccount = async (name: string, type: AccountType, initialBalance: number, targetGoal?: number) => {
    if (!user) return;
    return withSaveLock(async () => {
      const accId = "acc_" + Math.random().toString(36).substr(2, 9);

      const { data, error } = await supabase.from("accounts").insert({
        id: accId,
        user_id: user.id,
        name,
        type,
        initial_balance: Number(initialBalance) || 0,
        target_goal: targetGoal !== undefined ? Number(targetGoal) : null
      }).select().single();

      if (error) throw new Error(`Failed to add account: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify account after saving.");

      const mapped = mapAccountFromDb(data);
      await logAuditEvent("CREATE", "accounts", accId, null, mapped);
      await reloadData();
    });
  };

  const updateAccount = async (id: string, name: string, type: AccountType, initialBalance: number, targetGoal?: number) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = accounts.find(a => a.id === id);
      const updateData: any = {
        name,
        type,
        initial_balance: Number(initialBalance) || 0
      };
      if (targetGoal !== undefined) {
        updateData.target_goal = targetGoal;
      }

      const { data, error } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update account: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify account after updating.");

      const mapped = mapAccountFromDb(data);
      await logAuditEvent("UPDATE", "accounts", id, oldVal, mapped);
      await reloadData();
    });
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = accounts.find(a => a.id === id);
      const { error } = await supabase
        .from("accounts")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        if (error.message.includes("column") || error.code === "PGRST204") {
          const { error: hardError } = await supabase
            .from("accounts")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
          if (hardError) throw new Error(`Failed to delete account: ${hardError.message}`);
        } else {
          throw new Error(`Failed to delete account: ${error.message}`);
        }
      }

      await logAuditEvent("DELETE", "accounts", id, oldVal, { is_deleted: true });
      await reloadData();
    });
  };

  const restoreAccount = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ is_deleted: false })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(`Failed to restore account: ${error.message}`);
      await logAuditEvent("RESTORE", "accounts", id, { is_deleted: true }, { is_deleted: false });
      await reloadData();
    });
  };

  // Database Operations - Categories
  const addCategory = async (name: string, type: "Income" | "Expense") => {
    if (!user) return;
    return withSaveLock(async () => {
      const catId = "cat_" + Math.random().toString(36).substr(2, 9);

      const { data, error } = await supabase.from("categories").insert({
        id: catId,
        user_id: user.id,
        name,
        type,
        is_default: false
      }).select().single();

      if (error) throw new Error(`Failed to add category: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify category after saving.");

      const mapped = mapCategoryFromDb(data);
      await logAuditEvent("CREATE", "categories", catId, null, mapped);
      await reloadData();
    });
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = dbCategories.find(c => c.id === id);
      const { error } = await supabase
        .from("categories")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        if (error.message.includes("column") || error.code === "PGRST204") {
          const { error: hardError } = await supabase
            .from("categories")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
          if (hardError) throw new Error(`Failed to delete category: ${hardError.message}`);
        } else {
          throw new Error(`Failed to delete category: ${error.message}`);
        }
      }

      await logAuditEvent("DELETE", "categories", id, oldVal, { is_deleted: true });
      await reloadData();
    });
  };

  // Database Operations - Reconciliations
  const addReconciliation = async (rec: Omit<ReconciliationRecord, "id" | "userId" | "createdDate">): Promise<string> => {
    if (!user) throw new Error("No user session");
    return withSaveLock(async () => {
      const recId = "rec_" + Math.random().toString(36).substr(2, 9);

      const { data, error } = await supabase.from("bank_reconciliations").insert({
        id: recId,
        user_id: user.id,
        account_id: rec.accountId,
        account_name: rec.accountName,
        start_date: rec.startDate,
        end_date: rec.endDate,
        opening_balance: Number(rec.openingBalance) || 0,
        closing_balance: Number(rec.closingBalance) || 0,
        status: rec.status,
        statement_file_name: rec.statementFileName || null,
        statement_file_size: rec.statementFileSize || null,
        statement_rows: rec.statementRows,
        adjustments: rec.adjustments,
        summary: rec.summary,
        prepared_by: rec.preparedBy,
        notes: rec.notes || null
      }).select().single();

      if (error) throw new Error(`Failed to save reconciliation: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify reconciliation after saving.");

      const mapped = mapReconciliationFromDb(data);
      await logAuditEvent("CREATE", "bank_reconciliations", recId, null, mapped);
      await reloadData();
      return recId;
    });
  };

  const updateReconciliation = async (id: string, rec: Partial<ReconciliationRecord>) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = reconciliations.find(r => r.id === id);
      const updatePayload: any = {};
      if (rec.accountId !== undefined) updatePayload.account_id = rec.accountId;
      if (rec.accountName !== undefined) updatePayload.account_name = rec.accountName;
      if (rec.startDate !== undefined) updatePayload.start_date = rec.startDate;
      if (rec.endDate !== undefined) updatePayload.end_date = rec.endDate;
      if (rec.openingBalance !== undefined) updatePayload.opening_balance = Number(rec.openingBalance) || 0;
      if (rec.closingBalance !== undefined) updatePayload.closing_balance = Number(rec.closingBalance) || 0;
      if (rec.status !== undefined) updatePayload.status = rec.status;
      if (rec.statementFileName !== undefined) updatePayload.statement_file_name = rec.statementFileName;
      if (rec.statementFileSize !== undefined) updatePayload.statement_file_size = rec.statementFileSize;
      if (rec.statementRows !== undefined) updatePayload.statement_rows = rec.statementRows;
      if (rec.adjustments !== undefined) updatePayload.adjustments = rec.adjustments;
      if (rec.summary !== undefined) updatePayload.summary = rec.summary;
      if (rec.preparedBy !== undefined) updatePayload.prepared_by = rec.preparedBy;
      if (rec.notes !== undefined) updatePayload.notes = rec.notes;
      if (rec.completedDate !== undefined) updatePayload.completed_date = rec.completedDate;

      const { data, error } = await supabase
        .from("bank_reconciliations")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update reconciliation: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify reconciliation after updating.");

      const mapped = mapReconciliationFromDb(data);
      await logAuditEvent("UPDATE", "bank_reconciliations", id, oldVal, mapped);
      await reloadData();
    });
  };

  const deleteReconciliation = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const oldVal = reconciliations.find(r => r.id === id);
      const { error } = await supabase
        .from("bank_reconciliations")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        if (error.message.includes("column") || error.code === "PGRST204") {
          const { error: hardError } = await supabase
            .from("bank_reconciliations")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
          if (hardError) throw new Error(`Failed to delete reconciliation: ${hardError.message}`);
        } else {
          throw new Error(`Failed to delete reconciliation: ${error.message}`);
        }
      }

      await logAuditEvent("DELETE", "bank_reconciliations", id, oldVal, { is_deleted: true });
      await reloadData();
    });
  };

  // Database Operations - Budgets
  const updateCategoryBudget = async (categoryName: string, amount: number) => {
    if (!user) return;
    return withSaveLock(async () => {
      const updatedBudgets = {
        ...categoryBudgets,
        [categoryName]: Number(amount) || 0
      };

      const { data, error } = await supabase.from("budgets").upsert({
        id: "all",
        user_id: user.id,
        category_budgets: updatedBudgets,
        updated_at: new Date().toISOString()
      }, { onConflict: "id,user_id" }).select().single();

      if (error) throw new Error(`Failed to update budget: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify budget after updating.");

      setCategoryBudgets(updatedBudgets);
    });
  };

  const updateDebtDetail = async (accountId: string, detail: Partial<DebtDetail>) => {
    if (!user) return;
    
    let currentDebts = [...debtDetails];
    const existingIndex = currentDebts.findIndex(d => d.accountId === accountId);
    
    if (existingIndex >= 0) {
      currentDebts[existingIndex] = { ...currentDebts[existingIndex], ...detail };
    } else {
      const newDetail: DebtDetail = {
        id: "debt_" + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        accountId,
        interestRate: detail.interestRate || 0,
        minimumPayment: detail.minimumPayment || 0,
        creditLimit: detail.creditLimit,
        dueDate: detail.dueDate
      };
      currentDebts.push(newDetail);
    }
    
    localStorage.setItem(`debt_details_${user.id}`, JSON.stringify(currentDebts));
    setDebtDetails(currentDebts);
  };

  const accountsWithLiveBalances = accounts.map((acc) => ({
    ...acc,
    currentBalance: accountBalances[acc.id] !== undefined ? accountBalances[acc.id] : acc.initialBalance
  }));

  return (
    <FinanceContext.Provider
      value={{
        user,
        loading,
        accounts: accountsWithLiveBalances as any,
        transactions,
        categories,
        reconciliations,
        categoryBudgets,
        debtDetails,
        deletedAccounts,
        deletedTransactions,
        isDemoUser,
        currentBalance,
        totalIncome,
        totalExpenses,
        monthlySavings,
        receivables,
        payables,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        restoreTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        restoreAccount,
        addCategory,
        deleteCategory,
        addReconciliation,
        updateReconciliation,
        deleteReconciliation,
        updateCategoryBudget,
        updateDebtDetail,
        seedDefaults,
        clearAllData,
        reloadData
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
