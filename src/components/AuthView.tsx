import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../supabase";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, RefreshCw, KeyRound, Copy, Check, User, TrendingUp, TrendingDown, DollarSign, CheckCircle2, Wallet, BrainCircuit, ArrowUpRight, Percent, Activity, ReceiptText, BadgeCheck, Sparkles } from "lucide-react";

interface AuthViewProps {
  onSessionEstablished: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSessionEstablished }) => {
  const [view, setView] = useState<"login" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Detect reset password hash from URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setView("reset");
    }
  }, []);

  const isPreviewEnabled = (import.meta as any).env.MODE !== "production" && (import.meta as any).env.VITE_ENABLE_PREVIEW_MODE === "true";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured for production authentication. Please configure database keys.");
      }

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: username, // Standard Supabase login expects email
        password,
      });

      if (err) throw err;
      if (data.session) {
        onSessionEstablished();
      }
    } catch (err: any) {
      setError(err.message || "Invalid login credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    if (!isPreviewEnabled) {
      setError("Preview mode is disabled in this environment.");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    
    try {
      const response = await fetch("/api/preview-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({}),
        credentials: "same-origin"
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to establish preview session (Status: ${response.status})`);
      }

      const data = await response.json();
      if (data.status === "success") {
        onSessionEstablished();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during preview session initialization.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#type=recovery`,
      });

      if (err) throw err;
      setSuccessMsg("Password reset email sent! Please check your inbox for instructions.");
    } catch (err: any) {
      setError(err.message || "Failed to send recovery email. Please check your address.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (err) throw err;
      setSuccessMsg("Password has been successfully reset! You can now log in.");
      setTimeout(() => {
        setView("login");
        setEmail("");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySQL = () => {
    const sqlText = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    initial_balance NUMERIC NOT NULL DEFAULT 0,
    target_goal NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-x-hidden">
      {/* LEFT COLUMN: 40% on lg:, 45% on md: - Auth Form Container */}
      <div className="w-full md:w-[45%] lg:w-[40%] bg-white flex flex-col justify-center py-12 px-6 sm:px-10 lg:px-16 shadow-xl relative z-10 md:min-h-screen">
        <div className="max-w-md w-full mx-auto flex flex-col justify-center">
          
          <div className="flex flex-col items-start mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight font-sans">Finance Buddy</h2>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Secure Personal Workspace</p>
              </div>
            </div>
          </div>

          {isPreviewEnabled && (
            <div className="text-center bg-blue-50 text-blue-800 text-[10px] font-extrabold px-3 py-1.5 rounded-xl mb-5 uppercase tracking-wider border border-blue-100">
              DEVELOPMENT PREVIEW MODE ACTIVE
            </div>
          )}

          {/* Info alerts */}
          {!isSupabaseConfigured && (
            <div className="mb-5 bg-amber-50 border border-amber-100 text-amber-800 text-[11px] rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-normal">
                  <span className="font-bold">Database Mode:</span> Local Sandbox. Sign-up requires configuring database keys. {isPreviewEnabled && "Click the Easy Demo Entry below to enter instantly!"}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{successMsg}</span>
            </div>
          )}

          {view === "login" && (
            <div className="space-y-6">
              {/* Quick Demo Login Option */}
              {isPreviewEnabled && (
                <>
                  <div className="p-4 bg-blue-50/50 border border-blue-100/60 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-blue-800">
                      <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? "animate-spin" : ""}`} />
                      <span className="font-sans font-bold text-xs">Easy Demo Entry</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      No setup required! Click below to access the full workspace with interactive demo budgets instantly.
                    </p>
                    <button
                      type="button"
                      onClick={handleQuickDemoLogin}
                      disabled={loading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                      <span>Quick Log In as Demo Admin</span>
                    </button>
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Or Use Credentials</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>
                </>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Username / Email</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter username or email address"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Password</label>
                    {isSupabaseConfigured && (
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>Log In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed mb-1">
                Enter your authorized email address. If verified, we will send a secure link to reset your workspace password.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Send Reset Link</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors mt-2 cursor-pointer"
              >
                Back to Login
              </button>
            </form>
          )}

          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed mb-1">
                Enter and confirm your new strong password for your secure workspace.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Update Password</span>}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* RIGHT COLUMN: 60% on lg:, 55% on md:, flex on mobile below form */}
      <div className="w-full md:w-[55%] lg:w-[60%] bg-gradient-to-br from-[#1E3A8A] via-[#2948A5] to-[#4338CA] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden md:min-h-screen min-h-[500px]">
        {/* Decorative background effects */}
        <div className="absolute top-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-blue-400/20 blur-[90px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-400/20 blur-[90px]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 max-w-2xl mx-auto my-auto flex flex-col justify-center space-y-10 py-6">
          {/* Header section in decorative panel */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight font-sans max-w-xl">
              Take Control of Your <br className="hidden sm:inline" />
              <span className="text-blue-200">
                Financial Future
              </span>
            </h1>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
              Manage accounts, organize transactions, reconcile bank records, and receive AI-assisted financial guidance from one secure workspace.
            </p>
          </div>

          {/* Feature-Based Design Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Feature 1 */}
            <div className="p-5 bg-white/10 border border-white/15 rounded-2xl shadow-sm backdrop-blur-md space-y-3 hover:bg-white/12 hover:border-white/20 transition duration-300">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-400/10 border border-blue-400/20 text-blue-300 rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm leading-tight">Unified Account Management</h3>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-normal">
                View and manage your financial accounts from one organized workspace.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 bg-white/10 border border-white/15 rounded-2xl shadow-sm backdrop-blur-md space-y-3 hover:bg-white/12 hover:border-white/20 transition duration-300">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 rounded-xl flex items-center justify-center shrink-0">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm leading-tight">Organized Transaction Records</h3>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-normal">
                Record, review, and categorize financial activity with clarity.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 bg-white/10 border border-white/15 rounded-2xl shadow-sm backdrop-blur-md space-y-3 hover:bg-white/12 hover:border-white/20 transition duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 rounded-xl flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm leading-tight truncate">Accurate Bank Reconciliation</h3>
                </div>
                <span className="text-[9px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  Ready
                </span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-normal">
                Match statements with ledger records and identify differences efficiently.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 bg-white/10 border border-white/15 rounded-2xl shadow-sm backdrop-blur-md space-y-3 hover:bg-white/12 hover:border-white/20 transition duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-violet-400/10 border border-violet-400/20 text-violet-300 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm leading-tight truncate">AI-Assisted Financial Guidance</h3>
                </div>
                <span className="text-[9px] bg-violet-400/20 text-violet-300 border border-violet-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  Smart Insights
                </span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-normal">
                Receive clear insights based on the financial data stored in your workspace.
              </p>
            </div>

          </div>
        </div>

        {/* Footer/Trust Indicators */}
        <div className="relative z-10 flex items-center gap-2 justify-center md:justify-start text-xs text-slate-200 font-medium">
          <ShieldCheck className="h-4.5 w-4.5 text-blue-300 shrink-0" />
          <span>Secure financial workspace with protected account access</span>
        </div>
      </div>
    </div>
  );
};
