import React, { useState, useEffect, useRef } from "react";
import { useFinance } from "../context/FinanceContext";
import { useTax } from "../context/TaxContext";
import { supabase, isSupabaseConfigured, getAuthHeader } from "../supabase";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Calendar,
  Coins,
  Scale,
  DollarSign,
  Briefcase,
  HelpCircle,
  FileText,
  Clock,
  User,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { Transaction, Account } from "../types";

interface AIAdviserViewProps {
  onNavigate: (tab: string) => void;
}

interface AdviserConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AdviserMessage {
  id: string;
  conversationId: string;
  role: "user" | "model";
  text: string;
  createdAt: string;
}

interface AdviserInsight {
  title: string;
  whatDetected: string;
  whyItMatters: string;
  recommendedAction: string;
  targetTab: string;
  supportingRecords: string;
  confidenceLevel: "High" | "Medium" | "Low";
  previewData?: {
    type?: string;
    amount?: number;
    category?: string;
    description?: string;
  };
}

interface AdviserAlert {
  type: "danger" | "warning" | "success";
  title: string;
  description: string;
  sourceModule: "tax" | "reconciliation" | "transactions" | "accounts";
}

export const AIAdviserView: React.FC<AIAdviserViewProps> = ({ onNavigate }) => {
  const {
    user,
    transactions,
    accounts,
    reconciliations,
    currentBalance,
    totalIncome,
    totalExpenses,
    monthlySavings,
    receivables,
    payables,
    addTransaction
  } = useFinance();

  const { taxProfiles, taxConfigurations, taxCalculations } = useTax();

  // Component UI state
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "chat">("dashboard");
  const [analyzing, setAnalyzing] = useState(false);
  const [financialHealth, setFinancialHealth] = useState<string>("");
  const [aiInsights, setAiInsights] = useState<AdviserInsight[]>([]);
  const [aiAlerts, setAiAlerts] = useState<AdviserAlert[]>([]);
  const [deterministicAlerts, setDeterministicAlerts] = useState<AdviserAlert[]>([]);

  // Chat conversation state
  const [conversations, setConversations] = useState<AdviserConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdviserMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Safe action state
  const [pendingAction, setPendingAction] = useState<AdviserInsight | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat conversations
  const loadConversations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("adviser_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations((data || []).map(row => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  // Load messages for current conversation
  const loadMessages = async (convId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("adviser_messages")
        .select("*")
        .eq("conversation_id", convId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as "user" | "model",
        text: row.text,
        createdAt: row.created_at
      })));
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Load insights & alerts
  const loadInsightsAndSummary = async () => {
    if (!user) return;
    try {
      // Fetch summaries
      const { data: summaryData } = await supabase
        .from("adviser_summaries")
        .select("text")
        .eq("user_id", user.id)
        .single();
      setFinancialHealth(summaryData?.text || "");

      // Fetch insights
      const { data: insightsData } = await supabase
        .from("adviser_insights")
        .select("*")
        .eq("user_id", user.id);
      
      setAiInsights((insightsData || []).map(row => ({
        title: row.title,
        whatDetected: row.what_detected,
        whyItMatters: row.why_it_matters,
        recommendedAction: row.recommended_action,
        targetTab: row.target_tab,
        supportingRecords: row.supporting_records,
        confidenceLevel: row.confidence_level as any,
        previewData: row.preview_data || undefined
      })));

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from("adviser_alerts")
        .select("*")
        .eq("user_id", user.id);

      setAiAlerts((alertsData || []).map(row => ({
        type: row.type as any,
        title: row.title,
        description: row.description,
        sourceModule: row.source_module as any
      })));

    } catch (err) {
      console.error("Error loading insights / summaries:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
      loadInsightsAndSummary();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Safe client side rule engine to evaluate warnings deterministically (offline fallback)
  useEffect(() => {
    const alerts: AdviserAlert[] = [];

    // 1. Deficit Spending (Expenses exceeds income)
    if (totalExpenses > totalIncome && totalIncome > 0) {
      alerts.push({
        type: "danger",
        title: "Deficit Spending Detected",
        description: `Your lifetime expenses (৳${totalExpenses.toLocaleString()}) exceed your total income (৳${totalIncome.toLocaleString()}). This can drain your reserves quickly.`,
        sourceModule: "transactions"
      });
    }

    // 2. Savings decline (Negative monthly savings)
    if (monthlySavings < 0) {
      alerts.push({
        type: "warning",
        title: "Negative Monthly Savings",
        description: `You have spent ৳${Math.abs(monthlySavings).toLocaleString()} more than you earned this month. Consider deferring non-essential purchases.`,
        sourceModule: "transactions"
      });
    }

    // 3. Reconciliation difference not zero
    reconciliations.forEach((rec) => {
      if (rec.status === "Draft" && rec.summary?.difference !== 0) {
        alerts.push({
          type: "danger",
          title: `Unresolved Reconciliation: ${rec.accountName}`,
          description: `The draft bank reconciliation for ${rec.accountName} has an unresolved difference of ৳${(rec.summary?.difference || 0).toLocaleString()}.`,
          sourceModule: "reconciliation"
        });
      }
    });

    // 4. Unmatched bank statement items
    reconciliations.forEach((rec) => {
      if (rec.status === "Draft") {
        const unmatchedCount = rec.statementRows?.filter(r => r.status === "Unmatched").length || 0;
        if (unmatchedCount > 0) {
          alerts.push({
            type: "warning",
            title: `Unmatched Bank Items: ${rec.accountName}`,
            description: `There are ${unmatchedCount} unmatched bank statement lines in ${rec.accountName}'s active reconciliation.`,
            sourceModule: "reconciliation"
          });
        }
      }
    });

    // 5. Missing active tax configuration
    const activeConfig = taxConfigurations.find(c => c.isActive);
    if (!activeConfig) {
      alerts.push({
        type: "danger",
        title: "Missing Tax Configuration",
        description: "No active tax configuration was found. Taxes will be estimated using default thresholds.",
        sourceModule: "tax"
      });
    }

    // 6. Duplicate transaction detection
    const seen = new Set<string>();
    const duplicates: Transaction[] = [];
    transactions.forEach((tx) => {
      const key = `${tx.date}_${tx.type}_${tx.amount}_${tx.category}_${tx.description}`;
      if (seen.has(key)) {
        duplicates.push(tx);
      } else {
        seen.add(key);
      }
    });
    if (duplicates.length > 0) {
      alerts.push({
        type: "warning",
        title: `Possible Duplicate Transactions (${duplicates.length})`,
        description: `We detected possible duplicate transactions with identical dates and amounts, including "${duplicates[0].description}" of ৳${duplicates[0].amount.toLocaleString()}.`,
        sourceModule: "transactions"
      });
    }

    // 7. Overdue receivables
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdueRecs = transactions.filter(tx => tx.isReceivable && !tx.isCleared && new Date(tx.date) < thirtyDaysAgo);
    if (overdueRecs.length > 0) {
      alerts.push({
        type: "danger",
        title: `Overdue Receivables (${overdueRecs.length})`,
        description: `You have ${overdueRecs.length} receivable items outstanding for more than 30 days, totaling ৳${overdueRecs.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}.`,
        sourceModule: "transactions"
      });
    }

    // 8. Overdue payables
    const overduePays = transactions.filter(tx => tx.isPayable && !tx.isCleared && new Date(tx.date) < thirtyDaysAgo);
    if (overduePays.length > 0) {
      alerts.push({
        type: "danger",
        title: `Overdue Payables (${overduePays.length})`,
        description: `You have ${overduePays.length} unpaid bill/payable entries outstanding for more than 30 days, totaling ৳${overduePays.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}.`,
        sourceModule: "transactions"
      });
    }

    setDeterministicAlerts(alerts);
  }, [transactions, accounts, reconciliations, taxConfigurations, totalExpenses, totalIncome, monthlySavings]);

  // Invoke server side Gemini model to analyze the full financial context
  const runFullFinancialAnalysis = async () => {
    if (transactions.length === 0 || !user) return;

    setAnalyzing(true);
    setActionSuccessMessage(null);

    try {
      const minTransactions = transactions.slice(0, 45).map(tx => ({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        isReceivable: tx.isReceivable,
        isPayable: tx.isPayable,
        isCleared: tx.isCleared
      }));

      const minAccounts = accounts.map(acc => ({
        name: acc.name,
        type: acc.type,
        currentBalance: acc.currentBalance
      }));

      const minReconciliations = reconciliations.map(rec => ({
        accountName: rec.accountName,
        startDate: rec.startDate,
        endDate: rec.endDate,
        difference: rec.summary?.difference || 0,
        status: rec.status,
        unmatchedCount: rec.statementRows?.filter(r => r.status === "Unmatched").length || 0
      }));

      const minTaxCalculations = taxCalculations.map(calc => ({
        taxYear: calc.taxYear,
        status: calc.status,
        netTaxLiability: calc.summary?.netTaxLiability || 0,
        taxRefundable: calc.summary?.taxRefundable || 0
      }));

      const minTaxConfigs = taxConfigurations.map(cfg => ({
        taxYear: cfg.taxYear,
        isActive: cfg.isActive,
        taxFreeThreshold: cfg.taxFreeThreshold
      }));

      // Retrieve Supabase Access Token (JWT)
      const authHeader = await getAuthHeader();

      const response = await fetch("/api/advisor/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        credentials: "same-origin",
        body: JSON.stringify({
          transactions: minTransactions,
          accounts: minAccounts,
          reconciliations: minReconciliations,
          taxCalculations: minTaxCalculations,
          taxConfigurations: minTaxConfigs
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze data");
      }

      const data = await response.json();

      setFinancialHealth(data.financialHealthSummary || "");
      setAiInsights(data.insights || []);
      setAiAlerts(data.alerts || []);

      // Persist to Supabase Database
      // Delete old insights
      await supabase.from("adviser_insights").delete().eq("user_id", user.id);
      // Delete old alerts
      await supabase.from("adviser_alerts").delete().eq("user_id", user.id);
      
      // Save new summary
      await supabase.from("adviser_summaries").upsert({
        user_id: user.id,
        text: data.financialHealthSummary || "",
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

      // Save insights
      if (data.insights && data.insights.length > 0) {
        const insRows = data.insights.map((ins: AdviserInsight) => ({
          id: "ins_" + Math.random().toString(36).substr(2, 9),
          user_id: user.id,
          title: ins.title,
          what_detected: ins.whatDetected,
          why_it_matters: ins.whyItMatters,
          recommended_action: ins.recommendedAction,
          target_tab: ins.targetTab,
          supporting_records: ins.supportingRecords,
          confidence_level: ins.confidenceLevel,
          preview_data: ins.previewData || null
        }));
        await supabase.from("adviser_insights").insert(insRows);
      }

      // Save alerts
      if (data.alerts && data.alerts.length > 0) {
        const altRows = data.alerts.map((alt: AdviserAlert) => ({
          id: "alt_" + Math.random().toString(36).substr(2, 9),
          user_id: user.id,
          type: alt.type,
          title: alt.title,
          description: alt.description,
          source_module: alt.sourceModule
        }));
        await supabase.from("adviser_alerts").insert(altRows);
      }

      await loadInsightsAndSummary();

    } catch (error: any) {
      console.error("Analysis process error:", error);
      alert(`Could not complete AI analysis: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Start a fresh Adviser chat conversation
  const handleStartNewConversation = async () => {
    if (!user) return;
    try {
      const convId = "conv_" + Math.random().toString(36).substr(2, 9);
      
      await supabase.from("adviser_conversations").insert({
        id: convId,
        user_id: user.id,
        title: `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });

      setCurrentConversationId(convId);
      setActiveSubTab("chat");

      // Add Welcome Message from AI
      const msgId = "msg_" + Math.random().toString(36).substr(2, 9);
      await supabase.from("adviser_messages").insert({
        id: msgId,
        user_id: user.id,
        conversation_id: convId,
        role: "model",
        text: "Hello! I am your Google AI financial adviser. I have analyzed your ledger, tax preparation models, and bank statement reconciliations. What financial questions can I answer for you today?"
      });

      await loadConversations();

    } catch (err) {
      console.error("Error starting conversation:", err);
    }
  };

  // Send message to server side AI Adviser
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || chatInput;
    if (!rawText.trim() || sendingMessage || !user) return;

    let targetConvId = currentConversationId;

    try {
      setSendingMessage(true);
      if (!textToSend) {
        setChatInput("");
      }

      // If no conversation exists, start a new one automatically
      if (!targetConvId) {
        const convId = "conv_" + Math.random().toString(36).substr(2, 9);
        await supabase.from("adviser_conversations").insert({
          id: convId,
          user_id: user.id,
          title: rawText.length > 25 ? `${rawText.substring(0, 25)}...` : rawText
        });
        targetConvId = convId;
        setCurrentConversationId(convId);
      } else {
        await supabase
          .from("adviser_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", targetConvId)
          .eq("user_id", user.id);
      }

      // 1. Save user message to database
      const userMsgId = "msg_" + Math.random().toString(36).substr(2, 9);
      await supabase.from("adviser_messages").insert({
        id: userMsgId,
        user_id: user.id,
        conversation_id: targetConvId,
        role: "user",
        text: rawText
      });

      await loadMessages(targetConvId);

      // Build lightweight context fields for server payload
      const minTransactions = transactions.slice(0, 30).map(tx => ({
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        isReceivable: tx.isReceivable,
        isPayable: tx.isPayable,
        isCleared: tx.isCleared
      }));

      const minAccounts = accounts.map(acc => ({
        name: acc.name,
        type: acc.type,
        currentBalance: acc.currentBalance
      }));

      const minReconciliations = reconciliations.map(rec => ({
        accountName: rec.accountName,
        difference: rec.summary?.difference || 0,
        status: rec.status,
        unmatchedCount: rec.statementRows?.filter(r => r.status === "Unmatched").length || 0
      }));

      const minTaxCalculations = taxCalculations.map(calc => ({
        taxYear: calc.taxYear,
        status: calc.status,
        netTaxLiability: calc.summary?.netTaxLiability || 0
      }));

      const minTaxConfigs = taxConfigurations.map(cfg => ({
        taxYear: cfg.taxYear,
        isActive: cfg.isActive,
        taxFreeThreshold: cfg.taxFreeThreshold
      }));

      // History mapping
      const history = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      // Retrieve token
      const authHeader = await getAuthHeader();

      // 2. Query server side
      const chatResponse = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        credentials: "same-origin",
        body: JSON.stringify({
          message: rawText,
          history: history,
          context: {
            transactions: minTransactions,
            accounts: minAccounts,
            reconciliations: minReconciliations,
            taxCalculations: minTaxCalculations,
            taxConfigurations: minTaxConfigs
          }
        })
      });

      if (!chatResponse.ok) {
        throw new Error("Adviser was unable to answer. Please verify server connection.");
      }

      const result = await chatResponse.json();

      // 3. Save AI reply to database
      const aiMsgId = "msg_" + Math.random().toString(36).substr(2, 9);
      await supabase.from("adviser_messages").insert({
        id: aiMsgId,
        user_id: user.id,
        conversation_id: targetConvId,
        role: "model",
        text: result.text || "I was unable to retrieve a response. Please check back shortly."
      });

      await loadMessages(targetConvId);

    } catch (err: any) {
      console.error("Chat error:", err);
      if (targetConvId) {
        const errorMsgId = "msg_" + Math.random().toString(36).substr(2, 9);
        await supabase.from("adviser_messages").insert({
          id: errorMsgId,
          user_id: user.id,
          conversation_id: targetConvId,
          role: "model",
          text: `⚠️ Error communicating with Gemini: ${err.message || "Unknown server issue"}. Please make sure GEMINI_API_KEY is configured in Settings > Secrets.`
        });
        await loadMessages(targetConvId);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // Safe action: execute suggested transaction with user explicit confirmation
  const executePendingAction = async () => {
    if (!pendingAction?.previewData) return;
    
    try {
      const p = pendingAction.previewData;
      let accountId = "";
      if (accounts.length > 0) {
        accountId = accounts[0].id;
      }

      await addTransaction({
        date: new Date().toISOString().split("T")[0],
        type: (p.type as any) || "Expense",
        account: accountId,
        category: p.category || "Other expense",
        description: p.description || pendingAction.title,
        amount: Number(p.amount) || 0,
        notes: `AI Adviser recommended: ${pendingAction.whatDetected}`
      });

      setActionSuccessMessage(`Successfully posted "${p.description}" of ৳${p.amount?.toLocaleString()} to your ledger!`);
      setPendingAction(null);

      setTimeout(() => {
        runFullFinancialAnalysis();
      }, 1200);

    } catch (err: any) {
      console.error("Action execution failed:", err);
      alert(`Could not complete action: ${err.message}`);
    }
  };

  // Delete/Clear conversation session
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;

    try {
      await supabase.from("adviser_conversations").delete().eq("id", id).eq("user_id", user.id);
      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
      await loadConversations();
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  // Clear ALL conversation history
  const handleClearAllHistory = async () => {
    if (!window.confirm("Are you sure you want to clear ALL Adviser conversations? This cannot be undone.")) return;

    try {
      await supabase.from("adviser_conversations").delete().eq("user_id", user.id);
      setCurrentConversationId(null);
      setMessages([]);
      await loadConversations();
    } catch (err) {
      console.error("Error clearing all history:", err);
    }
  };

  // Combine local deterministic alerts and AI response alerts
  const allAlerts = [...deterministicAlerts];
  aiAlerts.forEach(aiAlert => {
    const isDuplicate = allAlerts.some(a => a.title.toLowerCase() === aiAlert.title.toLowerCase() || (a.sourceModule === aiAlert.sourceModule && a.type === aiAlert.type && Math.abs(a.title.length - aiAlert.title.length) < 5));
    if (!isDuplicate) {
      allAlerts.push(aiAlert);
    }
  });

  if (transactions.length === 0) {
    return (
      <div id="ai-adviser-empty" className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center">
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <Sparkles className="h-12 w-12 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-sans font-bold text-gray-900 tracking-tight mb-2">Google AI Adviser</h2>
          <p className="text-gray-500 font-sans text-sm max-w-md mb-6 leading-relaxed">
            Add transactions and financial records to receive personalized AI insights.
          </p>
          <button
            id="adviser-empty-route-add"
            onClick={() => onNavigate("add")}
            className="bg-blue-600 text-white font-sans text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm transition-all duration-150 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Transaction</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="ai-adviser-module-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-blue-900 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10">
          <Sparkles className="h-48 w-48 text-white" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 bg-blue-700/50 backdrop-blur-sm border border-blue-600/30 px-3 py-1 rounded-full w-max text-[10px] uppercase tracking-wider font-bold text-blue-200 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Google Gemini Financial Intelligence</span>
            </div>
            <h1 className="text-2xl font-sans font-bold tracking-tight text-white mb-2" id="ai-adviser-title-head">
              Google AI Financial Adviser
            </h1>
            <p className="text-xs text-blue-100 max-w-xl font-sans leading-relaxed">
              Finance Buddy's autonomous auditor. Analyze double-entry books, pinpoint compliance risks, find legal tax deductions, and receive actionable insights backed by explainable accounting rules.
            </p>
          </div>
          
          <button
            onClick={runFullFinancialAnalysis}
            disabled={analyzing}
            className="bg-white text-blue-800 hover:bg-blue-50 disabled:bg-blue-200 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2 flex-shrink-0 cursor-pointer border border-blue-100"
            id="btn-re-analyze-adviser"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Auditing Context...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Perform Financial Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200/80">
        <button
          onClick={() => setActiveSubTab("dashboard")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "dashboard"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
          id="btn-tab-adviser-dash"
        >
          Audit Dashboard
        </button>
        <button
          onClick={() => setActiveSubTab("chat")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "chat"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
          id="btn-tab-adviser-chat"
        >
          Interactive Chat
        </button>
      </div>

      {activeSubTab === "dashboard" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-start" id="adviser-dashboard-layout">
          {/* Left Columns - Summary & Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Health Statement */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-400 mb-3.5 flex items-center gap-1.5 font-mono">
                <Activity className="h-4 w-4 text-blue-500" />
                <span>Audit Summary & Financial Health</span>
              </h2>
              {financialHealth ? (
                <div className="text-xs leading-relaxed text-gray-600 bg-slate-50 border border-slate-100 rounded-xl p-4 font-sans whitespace-pre-wrap">
                  {financialHealth}
                </div>
              ) : (
                <div className="text-xs text-gray-400 font-sans italic text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                  No audit summary exists yet. Click "Perform Financial Audit" above to run Google Gemini model analysis.
                </div>
              )}
            </div>

            {/* Actionable Insights */}
            <div className="space-y-4">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1.5 font-mono">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>Recommended Legal Actions</span>
              </h2>

              {actionSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {aiInsights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {aiInsights.map((ins, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-sans font-bold text-gray-900 tracking-tight leading-snug">
                            {ins.title}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                              ins.confidenceLevel === "High"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : ins.confidenceLevel === "Medium"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-slate-50 text-slate-600 border-slate-100"
                            }`}
                          >
                            Confidence: {ins.confidenceLevel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-gray-700 uppercase tracking-wider text-[9px] block mb-1">What was detected</span>
                            <p className="text-gray-500 leading-relaxed text-[11px]">{ins.whatDetected}</p>
                          </div>
                          <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-50/50">
                            <span className="font-bold text-indigo-800 uppercase tracking-wider text-[9px] block mb-1">Why it matters</span>
                            <p className="text-indigo-600/90 leading-relaxed text-[11px]">{ins.whyItMatters}</p>
                          </div>
                        </div>

                        <div className="bg-blue-50/20 p-3 rounded-xl border border-blue-50/40 text-xs">
                          <span className="font-bold text-blue-900 uppercase tracking-wider text-[9px] block mb-1">Supporting ledger records</span>
                          <p className="text-blue-700/80 leading-relaxed text-[11px] font-mono">{ins.supportingRecords}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                          <span className="uppercase tracking-widest text-[9px] font-bold text-gray-400">Target Workspace:</span>
                          <button
                            onClick={() => onNavigate(ins.targetTab)}
                            className="text-blue-600 hover:underline capitalize flex items-center gap-0.5"
                          >
                            <span>{ins.targetTab === "tax" ? "Tax Calculator" : ins.targetTab === "reconciliation" ? "Bank Reconciliation" : ins.targetTab}</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ins.previewData && (
                            <button
                              onClick={() => setPendingAction(ins)}
                              className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>Review Suggested Action</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onNavigate(ins.targetTab)}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>Go to Module</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 font-sans italic text-center py-10 bg-white rounded-2xl border border-gray-200/80">
                  No automated actions found. Audit must be re-run to discover opportunities.
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Status & Alerts */}
          <div className="space-y-6">
            {/* Live Anomalies & Health Checks */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-400 mb-4 flex items-center gap-1.5 font-mono">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Auditing Anomalies ({allAlerts.length})</span>
              </h2>

              {allAlerts.length > 0 ? (
                <div className="space-y-3.5">
                  {allAlerts.map((alt, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                        alt.type === "danger"
                          ? "bg-rose-50/50 border-rose-100 text-rose-900"
                          : alt.type === "warning"
                          ? "bg-amber-50/40 border-amber-100 text-amber-900"
                          : "bg-emerald-50/30 border-emerald-100 text-emerald-900"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {alt.type === "danger" ? (
                          <AlertCircle className="h-4.5 w-4.5 text-rose-600" />
                        ) : alt.type === "warning" ? (
                          <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold block leading-snug">{alt.title}</span>
                        <p className="opacity-80 leading-relaxed text-[11px]">{alt.description}</p>
                        <span className="text-[9px] uppercase tracking-wider font-bold opacity-60 block pt-1">
                          Source: {alt.sourceModule}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 font-sans italic text-center py-6">
                  Perfect audit! No ledger anomalies detected.
                </div>
              )}
            </div>

            {/* Quick Ledger Telemetry */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1.5 font-mono">
                <Activity className="h-4 w-4 text-gray-400" />
                <span>Ledger Telemetry</span>
              </h2>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 block mb-0.5">Total Income</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">৳{totalIncome.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 block mb-0.5">Total Expenses</span>
                  <span className="text-xs font-bold text-rose-600 font-mono">৳{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 block mb-0.5">Receivables</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">৳{receivables.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 block mb-0.5">Payables</span>
                  <span className="text-xs font-bold text-red-600 font-mono">৳{payables.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[500px]" id="adviser-chat-layout">
          {/* Chat Sidebar: Session History */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px]">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 font-mono">History Sessions</span>
                <button
                  onClick={handleStartNewConversation}
                  className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition shrink-0 cursor-pointer"
                  title="New Session"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {conversations.length > 0 ? (
                <div className="space-y-1.5">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setCurrentConversationId(conv.id)}
                      className={`px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold flex items-center justify-between group transition-all ${
                        currentConversationId === conv.id
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-slate-50 hover:bg-slate-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate pr-1">{conv.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-700 hover:text-white transition shrink-0 cursor-pointer ${
                          currentConversationId === conv.id ? "text-blue-200 hover:text-white" : "text-gray-400"
                        }`}
                        title="Delete session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 italic text-center py-6 font-mono">
                  No saved conversations.
                </div>
              )}
            </div>

            {conversations.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="w-full py-2 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Clear All History
              </button>
            )}
          </div>

          {/* Active Chat Area */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm flex flex-col justify-between min-h-[480px]">
            {/* Messages body */}
            <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 max-h-[360px] min-h-[250px]">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 max-w-[85%] ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-2xl text-xs font-medium leading-relaxed font-sans ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-slate-100 text-gray-800 rounded-tl-none border border-slate-200/60"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="text-[8px] opacity-60 block text-right mt-1 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400">
                  <MessageSquare className="h-10 w-10 text-gray-300 animate-bounce mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider font-sans text-gray-500">Adviser Session Inactive</span>
                  <p className="text-[11px] text-gray-400 max-w-sm mt-1 leading-relaxed">
                    Select a conversation history session from the sidebar or click "Start Conversation" below to engage.
                  </p>
                  <button
                    onClick={handleStartNewConversation}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Start Conversation
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 border-t border-gray-100 pt-3"
            >
              <input
                type="text"
                disabled={sendingMessage}
                placeholder={sendingMessage ? "AI is processing your financial ledger..." : "Ask about tax configurations, unmatched reconciliation, or cash trends..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2 px-4 text-xs font-medium outline-none transition"
              />
              <button
                type="submit"
                disabled={sendingMessage || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white p-2.5 rounded-xl shadow-md transition shrink-0 cursor-pointer"
              >
                {sendingMessage ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Send className="h-4.5 w-4.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Safe Action Modal Panel */}
      {pendingAction && pendingAction.previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="safe-action-modal">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-2.5 text-blue-600 pb-2 border-b border-gray-100">
              <ShieldCheck className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-sm font-sans font-bold text-gray-900">Secure Action Confirmation</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 font-mono">Explicit User Permission Required</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Google AI Adviser recommends posting a ledger record to rectify what was detected:
              <strong className="block text-gray-700 mt-1 italic font-medium">"{pendingAction.whatDetected}"</strong>
            </p>

            {/* Proposed Transaction Params */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 font-mono text-xs text-gray-700">
              <span className="font-bold text-[9px] uppercase tracking-widest text-slate-400 block pb-1 border-b border-slate-200/80">Proposed Ledger Transaction Parameters</span>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-400">Date:</span>
                <span className="font-bold">{new Date().toISOString().split("T")[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-400">Type:</span>
                <span className="font-bold text-rose-600">{pendingAction.previewData.type || "Expense"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-400">Category:</span>
                <span className="font-bold">{pendingAction.previewData.category || "Other expense"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-400">Description:</span>
                <span className="font-bold truncate pr-1 max-w-[200px]">{pendingAction.previewData.description || pendingAction.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-400">Amount:</span>
                <span className="font-bold text-slate-900">৳{(pendingAction.previewData.amount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between gap-3 text-xs font-bold uppercase tracking-wider pt-2">
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 text-center transition cursor-pointer"
              >
                Decline Action
              </button>
              <button
                onClick={executePendingAction}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center shadow-md transition cursor-pointer"
              >
                Approve & Post Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
