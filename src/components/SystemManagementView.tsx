import React, { useEffect, useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { 
  Database, 
  RotateCcw, 
  Search, 
  Filter, 
  History, 
  Trash2, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  CheckCircle2, 
  Calendar, 
  User, 
  Layers, 
  Eye, 
  Download,
  ShieldCheck,
  Undo2
} from "lucide-react";

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface AuditRecord {
  user: string;
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE";
  table: string;
  recordId: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export const SystemManagementView: React.FC = () => {
  const { 
    deletedAccounts, 
    deletedTransactions, 
    restoreAccount, 
    restoreTransaction,
    loading: contextLoading
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<"backups" | "audit" | "trash">("backups");
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filtering and Searching States
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

  // Load data for active tab
  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const getHeaders = async () => {
    // Standard headers with Authorization if session is active
    const saved = sessionStorage.getItem("preview-user");
    let token = "";
    if (saved) {
      try {
        const u = JSON.parse(saved);
        token = u.token || "";
      } catch (_) {}
    }
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      if (activeSubTab === "backups") {
        const res = await fetch("/api/backups", { headers });
        if (!res.ok) throw new Error("Failed to fetch backups list");
        const data = await res.json();
        setBackups(data);
      } else if (activeSubTab === "audit") {
        const res = await fetch("/api/audit", { headers });
        if (!res.ok) throw new Error("Failed to fetch audit logs");
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  };

  // Backup & Restore Actions
  const handleCreateBackup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/backup", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Manual backup failed");
      setSuccess("Manual backup successfully completed! A snapshots ledger was committed to storage.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Backup execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoBackupCheck = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/backup/auto", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto backup failed");
      setSuccess("Auto backup checked and updated! Standard rotated copies were synchronized.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Auto backup validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you absolutely sure you want to restore the database from ${filename}?\nThis will completely replace the active ledger database and trigger automatic rollbacks on failure.`)) {
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/restore", { 
        method: "POST", 
        headers,
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Database restore failed");
      setSuccess("Database restore completed successfully! Refreshing dynamic workspaces...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Restore execution failed.");
    } finally {
      setLoading(false);
    }
  };

  // Restore Soft-Deleted Record
  const handleRestoreRecord = async (type: "account" | "transaction", id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (type === "account") {
        await restoreAccount(id);
        setSuccess("Account successfully restored! Live balances and double-entry book assets recalculated.");
      } else {
        await restoreTransaction(id);
        setSuccess("Transaction successfully restored! General ledger trails and reconciled matches updated.");
      }
    } catch (err: any) {
      setError(err.message || "Recovery operation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Format Helper for bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Filtered Audit Logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recordId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user && log.user.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAction = actionFilter === "" || log.action === actionFilter;
    const matchesTable = tableFilter === "" || log.table === tableFilter;
    return matchesSearch && matchesAction && matchesTable;
  });

  return (
    <div className="space-y-6" id="system-management-container">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
            System Control & Database Security
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Admin console • Real-time backups, transactional recovery, and immutable audit trails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Operation Feedback Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-800 text-xs shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold font-sans">Operation Blocked:</span>
            <p className="font-mono leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-800 text-xs shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold font-sans">Operation Succeeded:</span>
            <p className="font-mono leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      {/* Navigation Sub Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveSubTab("backups")}
            className={`pb-3 text-sm font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeSubTab === "backups"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-gray-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Backups & Restore
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab("audit")}
            className={`pb-3 text-sm font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeSubTab === "audit"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-gray-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Log Ledger
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab("trash")}
            className={`pb-3 text-sm font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeSubTab === "trash"
                ? "border-blue-700 text-blue-700 font-bold"
                : "border-transparent text-gray-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Soft Delete Recovery ({deletedAccounts.length + deletedTransactions.length})
            </span>
          </button>
        </div>
      </div>

      {/* Main Sections */}
      {activeSubTab === "backups" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-blue-50/50 shadow-sm space-y-4">
              <h3 className="font-sans font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-blue-700" />
                Actions Ledger
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Back up your entire database state (accounts, reconciliations, transactions, budgets) into safe, immutable snapshots. Restore instantly in case of manual data entry issues.
              </p>
              
              <div className="pt-2 space-y-3">
                <button
                  onClick={handleCreateBackup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  <Database className="h-4 w-4" />
                  Perform Manual Backup
                </button>
                
                <button
                  onClick={handleAutoBackupCheck}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Auto Backup
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3 text-xs text-slate-600 leading-relaxed">
              <span className="font-bold font-sans text-slate-800 block">Security Features Included:</span>
              <ul className="list-disc pl-4 space-y-1.5 font-mono text-[10px]">
                <li><span className="font-bold text-blue-700">Transactional Rollback:</span> If any table import fails during restore, the complete pre-existing database state is automatically re-assembled to protect data integrity.</li>
                <li><span className="font-bold text-blue-700">Dependency Order:</span> System resolves referential foreign-keys automatically on insertion.</li>
                <li><span className="font-bold text-blue-700">Non-volatile:</span> Snapshots are persisted to disk out of container memory constraints.</li>
              </ul>
            </div>
          </div>

          {/* Backup List Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-sans font-bold text-sm text-slate-800">
                  Backup Registries
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">
                  {backups.length} Files found
                </span>
              </div>

              {loading && backups.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 font-mono">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                  Loading backup registry details...
                </div>
              ) : backups.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 font-sans space-y-2">
                  <Database className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No backup snapshots found</p>
                  <p className="text-[11px] text-gray-400">Trigger a manual backup to initiate the secure ledger.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                  {backups.map((backup) => (
                    <div key={backup.filename} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-all">
                      <div className="space-y-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800 break-all block">
                          {backup.filename}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(backup.createdAt).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-400" />
                            {formatBytes(backup.size)}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRestoreBackup(backup.filename)}
                        disabled={loading}
                        className="flex-shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50/50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer border border-blue-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "audit" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs by table, record ID, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Filter className="h-3 w-3 text-slate-500" />
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">Filters</span>
              </div>
              
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="RESTORE">RESTORE</option>
              </select>

              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white focus:outline-none"
              >
                <option value="">All Tables</option>
                <option value="accounts">Accounts</option>
                <option value="transactions">Transactions</option>
                <option value="categories">Categories</option>
                <option value="bank_reconciliations">Reconciliations</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logs List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-sans font-bold text-sm text-slate-800">
                  Immutable Audit Feed
                </h3>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">
                  {filteredLogs.length} Actions parsed
                </span>
              </div>

              {loading && auditLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 font-mono">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                  Loading audit log ledger...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 font-sans space-y-2">
                  <History className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No auditable actions tracked</p>
                  <p className="text-[11px] text-gray-400">Trigger transaction creations or modifications to record changes.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {filteredLogs.map((log, index) => (
                    <div 
                      key={index} 
                      onClick={() => setSelectedAudit(log)}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer transition-all ${
                        selectedAudit === log ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            log.action === "CREATE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            log.action === "UPDATE" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            log.action === "RESTORE" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                            "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {log.table}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            {log.user}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            ID: {log.recordId}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-blue-600 flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Change Detail Inspector */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 sticky top-24">
                <h3 className="font-sans font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-blue-700" />
                  Audit Inspector
                </h3>
                
                {selectedAudit ? (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 font-mono text-[10px] text-slate-600">
                      <div><span className="font-bold text-slate-800">Timestamp:</span> {new Date(selectedAudit.timestamp).toLocaleString()}</div>
                      <div><span className="font-bold text-slate-800">Action Type:</span> {selectedAudit.action}</div>
                      <div><span className="font-bold text-slate-800">Database Table:</span> {selectedAudit.table}</div>
                      <div><span className="font-bold text-slate-800">Operator User:</span> {selectedAudit.user}</div>
                      <div><span className="font-bold text-slate-800">Unique record ID:</span> {selectedAudit.recordId}</div>
                    </div>

                    <div className="space-y-3 font-mono text-[10px]">
                      <div>
                        <span className="font-bold text-slate-800 mb-1.5 block">Pre-existing state:</span>
                        <pre className="bg-slate-50 p-2 border border-slate-100 rounded-lg max-h-32 overflow-auto text-[9px]">
                          {selectedAudit.oldValue ? JSON.stringify(selectedAudit.oldValue, null, 2) : "NULL"}
                        </pre>
                      </div>

                      <div>
                        <span className="font-bold text-slate-800 mb-1.5 block">Post-existing state:</span>
                        <pre className="bg-slate-50 p-2 border border-slate-100 rounded-lg max-h-32 overflow-auto text-[9px]">
                          {selectedAudit.newValue ? JSON.stringify(selectedAudit.newValue, null, 2) : "NULL"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400 font-sans border-2 border-dashed border-slate-100 rounded-xl">
                    Select a record from the immutable audit feed to inspect precise old/new property changes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "trash" && (
        <div className="space-y-6">
          {/* Deleted Accounts list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-700" />
                Soft-Deleted Accounts ({deletedAccounts.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Safe storage
              </span>
            </div>

            {deletedAccounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-sans">
                No soft-deleted accounts found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {deletedAccounts.map((account) => (
                  <div key={account.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-all text-xs font-mono">
                    <div className="space-y-1">
                      <span className="font-sans font-bold text-slate-800 block text-xs">
                        {account.name}
                      </span>
                      <div className="text-[10px] text-gray-500 flex items-center gap-3">
                        <span>Type: {account.type}</span>
                        <span>Balance: ৳{account.initialBalance.toLocaleString()}</span>
                        <span>ID: {account.id}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreRecord("account", account.id)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50/50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer border border-blue-100"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Restore Account
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deleted Transactions list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-700" />
                Soft-Deleted Transactions ({deletedTransactions.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Recoverable history
              </span>
            </div>

            {deletedTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-sans">
                No soft-deleted transactions found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {deletedTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-all text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          tx.type === "Income" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          tx.type === "Expense" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                          "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {tx.type}
                        </span>
                        <span className="font-sans font-bold text-slate-800 text-xs">
                          {tx.description || tx.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Date: {tx.date}</span>
                        <span>Amount: ৳{tx.amount.toLocaleString()}</span>
                        <span>Account: {tx.account}</span>
                        <span>ID: {tx.id}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreRecord("transaction", tx.id)}
                      disabled={loading}
                      className="self-start sm:self-center flex items-center gap-1 px-3 py-1.5 bg-blue-50/50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer border border-blue-100"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Restore Ledger
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
