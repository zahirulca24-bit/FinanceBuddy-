import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured, getAuthHeader } from "../supabase";
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
  const [user, setUser] = useState<any>(null);
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
  
  const checkLocalStorageMode = (): boolean => {
    return !isSupabaseConfigured || user?.id === "00000000-0000-0000-0000-000000000000" || user?.role === "preview-admin";
  };
  
  const isSavingRef = useRef(false);

  const logAuditEvent = async (action: string, table: string, recordId: string, oldValue: any, newValue: any) => {
    try {
      const authHeader = await getAuthHeader();
      
      await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        credentials: "same-origin",
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

  const checkPreviewSession = async (): Promise<any | null> => {
    const isPreviewEnabled = (import.meta as any).env.MODE !== "production" && (import.meta as any).env.VITE_ENABLE_PREVIEW_MODE === "true";
    if (!isPreviewEnabled) return null;
    try {
      const res = await fetch("/api/preview-session", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (data?.status === "success" && data?.user) {
          return data.user;
        }
      }
    } catch (e) {
      console.error("Failed to fetch preview session:", e);
    }
    return null;
  };

  // Auth session state listener
  useEffect(() => {
    let isSubscribed = true;

    const initSession = async () => {
      if (!isSupabaseConfigured) {
        const pUser = await checkPreviewSession();
        if (isSubscribed) {
          setUser(pUser);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isSubscribed) {
            setUser(session.user);
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.error("Supabase session error:", err);
      }

      const pUser = await checkPreviewSession();
      if (isSubscribed) {
        setUser(pUser);
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isSubscribed) return;
      if (session?.user) {
        setUser(session.user);
      } else {
        checkPreviewSession().then((pUser) => {
          if (isSubscribed) {
            setUser(pUser);
            if (!pUser) {
              setAccounts([]);
              setTransactions([]);
              setDbCategories([]);
              setReconciliations([]);
              setCategoryBudgets({});
            }
          }
        });
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const reloadDataLocal = (userId: string) => {
    try {
      // Load Accounts
      let localAccsRaw = localStorage.getItem(`local_accounts_${userId}`);
      if (!localAccsRaw) {
        const initialAccounts = DEFAULT_ACCOUNTS.map((acc, index) => ({
          id: `acc_${index}_${Math.random().toString(36).substr(2, 5)}`,
          user_id: userId,
          name: acc.name,
          type: acc.type,
          initial_balance: acc.initialBalance,
          is_deleted: false,
          created_at: new Date().toISOString()
        }));
        localStorage.setItem(`local_accounts_${userId}`, JSON.stringify(initialAccounts));
        localAccsRaw = JSON.stringify(initialAccounts);
      }
      const parsedAccs = JSON.parse(localAccsRaw);
      setAccounts(parsedAccs.filter((a: any) => !a.is_deleted).map(mapAccountFromDb));
      setDeletedAccounts(parsedAccs.filter((a: any) => !!a.is_deleted).map(mapAccountFromDb));

      // Load Transactions
      let localTxsRaw = localStorage.getItem(`local_transactions_${userId}`);
      if (!localTxsRaw) {
        const todayStr = new Date().toISOString().split("T")[0];
        const firstAccountId = parsedAccs[0]?.id || "acc_demo_cash";
        const initialTransactions = [
          {
            id: "tx_init_1",
            user_id: userId,
            date: todayStr,
            type: "Income",
            account: firstAccountId,
            category: "Salary",
            description: "Initial Salary Deposit (Demo)",
            amount: 5000,
            is_deleted: false,
            created_at: new Date().toISOString()
          },
          {
            id: "tx_init_2",
            user_id: userId,
            date: todayStr,
            type: "Expense",
            account: firstAccountId,
            category: "Food",
            description: "Restaurant Dining (Demo)",
            amount: 120,
            is_deleted: false,
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem(`local_transactions_${userId}`, JSON.stringify(initialTransactions));
        localTxsRaw = JSON.stringify(initialTransactions);
      }
      const parsedTxs = JSON.parse(localTxsRaw);
      const mappedTx = parsedTxs.filter((t: any) => !t.is_deleted).map(mapTransactionFromDb);
      mappedTx.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));
      setTransactions(mappedTx);

      const mappedDeletedTx = parsedTxs.filter((t: any) => !!t.is_deleted).map(mapTransactionFromDb);
      mappedDeletedTx.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));
      setDeletedTransactions(mappedDeletedTx);

      // Load Categories
      const localCatsRaw = localStorage.getItem(`local_categories_${userId}`) || "[]";
      const parsedCats = JSON.parse(localCatsRaw);
      setDbCategories(parsedCats.filter((c: any) => !c.is_deleted).map(mapCategoryFromDb));

      // Load Reconciliations
      const localRecsRaw = localStorage.getItem(`local_reconciliations_${userId}`) || "[]";
      const parsedRecs = JSON.parse(localRecsRaw);
      const mappedRec = parsedRecs.filter((r: any) => !r.is_deleted).map(mapReconciliationFromDb);
      mappedRec.sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
      setReconciliations(mappedRec);

      // Load Budgets
      const localBudgetsRaw = localStorage.getItem(`local_budgets_${userId}`) || "{}";
      setCategoryBudgets(JSON.parse(localBudgetsRaw));

      // Load Debts
      const localDebts = localStorage.getItem(`debt_details_${userId}`);
      setDebtDetails(localDebts ? JSON.parse(localDebts) : []);

    } catch (err) {
      console.error("Error loading mock data from localStorage:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all user ledger data from Supabase or localStorage fallback
  const reloadData = async () => {
    if (!user) return;

    if (checkLocalStorageMode()) {
      reloadDataLocal(user.id);
      return;
    }

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
      console.warn("Error fetching financial data from Supabase, falling back to localStorage:", err);
      reloadDataLocal(user.id);
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

      if (!isSupabaseConfigured) {
        const localTxsRaw = localStorage.getItem(`local_transactions_${user.id}`) || "[]";
        const parsedTxs = JSON.parse(localTxsRaw);
        const newTx = {
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
          is_cleared: !!tx.isCleared,
          is_deleted: false,
          created_at: new Date().toISOString()
        };
        parsedTxs.push(newTx);
        localStorage.setItem(`local_transactions_${user.id}`, JSON.stringify(parsedTxs));
        const mapped = mapTransactionFromDb(newTx);
        await logAuditEvent("CREATE", "transactions", txId, null, mapped);
        await reloadData();
        return;
      }

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
      const oldVal = transactions.find(t => t.id === id) || deletedTransactions.find(t => t.id === id);

      if (!isSupabaseConfigured) {
        const localTxsRaw = localStorage.getItem(`local_transactions_${user.id}`) || "[]";
        let parsedTxs = JSON.parse(localTxsRaw);
        parsedTxs = parsedTxs.map((t: any) => {
          if (t.id === id) {
            return {
              ...t,
              date: tx.date !== undefined ? tx.date : t.date,
              type: tx.type !== undefined ? tx.type : t.type,
              account: tx.account !== undefined ? tx.account : t.account,
              to_account: tx.toAccount !== undefined ? (tx.toAccount || null) : t.to_account,
              category: tx.category !== undefined ? tx.category : t.category,
              description: tx.description !== undefined ? tx.description : t.description,
              amount: tx.amount !== undefined ? (Number(tx.amount) || 0) : t.amount,
              payment_method: tx.paymentMethod !== undefined ? (tx.paymentMethod || null) : t.payment_method,
              reference_number: tx.referenceNumber !== undefined ? (tx.referenceNumber || null) : t.reference_number,
              notes: tx.notes !== undefined ? (tx.notes || null) : t.notes,
              is_receivable: tx.isReceivable !== undefined ? !!tx.isReceivable : t.is_receivable,
              is_payable: tx.isPayable !== undefined ? !!tx.isPayable : t.is_payable,
              is_cleared: tx.isCleared !== undefined ? !!tx.isCleared : t.is_cleared
            };
          }
          return t;
        });
        localStorage.setItem(`local_transactions_${user.id}`, JSON.stringify(parsedTxs));
        const updated = parsedTxs.find((t: any) => t.id === id);
        if (updated) {
          await logAuditEvent("UPDATE", "transactions", id, oldVal, mapTransactionFromDb(updated));
        }
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localTxsRaw = localStorage.getItem(`local_transactions_${user.id}`) || "[]";
        let parsedTxs = JSON.parse(localTxsRaw);
        parsedTxs = parsedTxs.map((t: any) => {
          if (t.id === id) {
            return { ...t, is_deleted: true };
          }
          return t;
        });
        localStorage.setItem(`local_transactions_${user.id}`, JSON.stringify(parsedTxs));
        await logAuditEvent("DELETE", "transactions", id, oldVal, { is_deleted: true });
        await reloadData();
        return;
      }

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
      if (!isSupabaseConfigured) {
        const localTxsRaw = localStorage.getItem(`local_transactions_${user.id}`) || "[]";
        let parsedTxs = JSON.parse(localTxsRaw);
        parsedTxs = parsedTxs.map((t: any) => {
          if (t.id === id) {
            return { ...t, is_deleted: false };
          }
          return t;
        });
        localStorage.setItem(`local_transactions_${user.id}`, JSON.stringify(parsedTxs));
        await logAuditEvent("RESTORE", "transactions", id, { is_deleted: true }, { is_deleted: false });
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localAccsRaw = localStorage.getItem(`local_accounts_${user.id}`) || "[]";
        const parsedAccs = JSON.parse(localAccsRaw);
        const newAcc = {
          id: accId,
          user_id: user.id,
          name,
          type,
          initial_balance: Number(initialBalance) || 0,
          target_goal: targetGoal !== undefined ? Number(targetGoal) : null,
          is_deleted: false,
          created_at: new Date().toISOString()
        };
        parsedAccs.push(newAcc);
        localStorage.setItem(`local_accounts_${user.id}`, JSON.stringify(parsedAccs));
        await logAuditEvent("CREATE", "accounts", accId, null, mapAccountFromDb(newAcc));
        await reloadData();
        return;
      }

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
      const oldVal = accounts.find(a => a.id === id) || deletedAccounts.find(a => a.id === id);

      if (!isSupabaseConfigured) {
        const localAccsRaw = localStorage.getItem(`local_accounts_${user.id}`) || "[]";
        let parsedAccs = JSON.parse(localAccsRaw);
        parsedAccs = parsedAccs.map((a: any) => {
          if (a.id === id) {
            return {
              ...a,
              name,
              type,
              initial_balance: Number(initialBalance) || 0,
              target_goal: targetGoal !== undefined ? targetGoal : a.target_goal
            };
          }
          return a;
        });
        localStorage.setItem(`local_accounts_${user.id}`, JSON.stringify(parsedAccs));
        const updated = parsedAccs.find((a: any) => a.id === id);
        if (updated) {
          await logAuditEvent("UPDATE", "accounts", id, oldVal, mapAccountFromDb(updated));
        }
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localAccsRaw = localStorage.getItem(`local_accounts_${user.id}`) || "[]";
        let parsedAccs = JSON.parse(localAccsRaw);
        parsedAccs = parsedAccs.map((a: any) => {
          if (a.id === id) {
            return { ...a, is_deleted: true };
          }
          return a;
        });
        localStorage.setItem(`local_accounts_${user.id}`, JSON.stringify(parsedAccs));
        await logAuditEvent("DELETE", "accounts", id, oldVal, { is_deleted: true });
        await reloadData();
        return;
      }

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
      if (!isSupabaseConfigured) {
        const localAccsRaw = localStorage.getItem(`local_accounts_${user.id}`) || "[]";
        let parsedAccs = JSON.parse(localAccsRaw);
        parsedAccs = parsedAccs.map((a: any) => {
          if (a.id === id) {
            return { ...a, is_deleted: false };
          }
          return a;
        });
        localStorage.setItem(`local_accounts_${user.id}`, JSON.stringify(parsedAccs));
        await logAuditEvent("RESTORE", "accounts", id, { is_deleted: true }, { is_deleted: false });
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localCatsRaw = localStorage.getItem(`local_categories_${user.id}`) || "[]";
        const parsedCats = JSON.parse(localCatsRaw);
        const newCat = {
          id: catId,
          user_id: user.id,
          name,
          type,
          is_default: false,
          is_deleted: false,
          created_at: new Date().toISOString()
        };
        parsedCats.push(newCat);
        localStorage.setItem(`local_categories_${user.id}`, JSON.stringify(parsedCats));
        await logAuditEvent("CREATE", "categories", catId, null, mapCategoryFromDb(newCat));
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localCatsRaw = localStorage.getItem(`local_categories_${user.id}`) || "[]";
        let parsedCats = JSON.parse(localCatsRaw);
        parsedCats = parsedCats.map((c: any) => {
          if (c.id === id) {
            return { ...c, is_deleted: true };
          }
          return c;
        });
        localStorage.setItem(`local_categories_${user.id}`, JSON.stringify(parsedCats));
        await logAuditEvent("DELETE", "categories", id, oldVal, { is_deleted: true });
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localRecsRaw = localStorage.getItem(`local_reconciliations_${user.id}`) || "[]";
        const parsedRecs = JSON.parse(localRecsRaw);
        const newRec = {
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
          notes: rec.notes || null,
          is_deleted: false,
          created_date: new Date().toISOString()
        };
        parsedRecs.push(newRec);
        localStorage.setItem(`local_reconciliations_${user.id}`, JSON.stringify(parsedRecs));
        await logAuditEvent("CREATE", "bank_reconciliations", recId, null, mapReconciliationFromDb(newRec));
        await reloadData();
        return recId;
      }

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

      if (!isSupabaseConfigured) {
        const localRecsRaw = localStorage.getItem(`local_reconciliations_${user.id}`) || "[]";
        let parsedRecs = JSON.parse(localRecsRaw);
        parsedRecs = parsedRecs.map((r: any) => {
          if (r.id === id) {
            return {
              ...r,
              account_id: rec.accountId !== undefined ? rec.accountId : r.account_id,
              account_name: rec.accountName !== undefined ? rec.accountName : r.account_name,
              start_date: rec.startDate !== undefined ? rec.startDate : r.start_date,
              end_date: rec.endDate !== undefined ? rec.endDate : r.end_date,
              opening_balance: rec.openingBalance !== undefined ? (Number(rec.openingBalance) || 0) : r.opening_balance,
              closing_balance: rec.closingBalance !== undefined ? (Number(rec.closingBalance) || 0) : r.closing_balance,
              status: rec.status !== undefined ? rec.status : r.status,
              statement_file_name: rec.statementFileName !== undefined ? rec.statementFileName : r.statement_file_name,
              statement_file_size: rec.statementFileSize !== undefined ? rec.statementFileSize : r.statement_file_size,
              statement_rows: rec.statementRows !== undefined ? rec.statementRows : r.statement_rows,
              adjustments: rec.adjustments !== undefined ? rec.adjustments : r.adjustments,
              summary: rec.summary !== undefined ? rec.summary : r.summary,
              prepared_by: rec.preparedBy !== undefined ? rec.preparedBy : r.prepared_by,
              notes: rec.notes !== undefined ? rec.notes : r.notes,
              completed_date: rec.completedDate !== undefined ? rec.completedDate : r.completed_date
            };
          }
          return r;
        });
        localStorage.setItem(`local_reconciliations_${user.id}`, JSON.stringify(parsedRecs));
        const updated = parsedRecs.find((r: any) => r.id === id);
        if (updated) {
          await logAuditEvent("UPDATE", "bank_reconciliations", id, oldVal, mapReconciliationFromDb(updated));
        }
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        const localRecsRaw = localStorage.getItem(`local_reconciliations_${user.id}`) || "[]";
        let parsedRecs = JSON.parse(localRecsRaw);
        parsedRecs = parsedRecs.map((r: any) => {
          if (r.id === id) {
            return { ...r, is_deleted: true };
          }
          return r;
        });
        localStorage.setItem(`local_reconciliations_${user.id}`, JSON.stringify(parsedRecs));
        await logAuditEvent("DELETE", "bank_reconciliations", id, oldVal, { is_deleted: true });
        await reloadData();
        return;
      }

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

      if (!isSupabaseConfigured) {
        localStorage.setItem(`local_budgets_${user.id}`, JSON.stringify(updatedBudgets));
        setCategoryBudgets(updatedBudgets);
        return;
      }

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
