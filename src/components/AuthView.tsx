import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../supabase";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, RefreshCw, KeyRound, Copy, Check, User } from "lucide-react";

interface AuthViewProps {
  onSessionEstablished: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSessionEstablished }) => {
  const [view, setView] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Registration states
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Detect reset password hash from URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setView("reset");
    }
  }, []);

  const isPreviewEnabled = !!((import.meta as any).env.DEV && (import.meta as any).env.VITE_ENABLE_PREVIEW_MODE === "true");

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
    
    setTimeout(() => {
      const previewUser = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "admin@preview.local",
        role: "preview-admin"
      };
      sessionStorage.setItem("preview-user", JSON.stringify(previewUser));
      onSessionEstablished();
      setLoading(false);
    }, 650);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet. Add environment keys in Settings to enable account registration.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });

      if (err) throw err;

      if (data.user) {
        if (data.session) {
          setSuccessMsg("Registration successful! Logging you in...");
          setTimeout(() => {
            onSessionEstablished();
          }, 1500);
        } else {
          setSuccessMsg("Registration successful! Please check your email inbox to confirm your account, then log in.");
          setView("login");
          setUsername(regEmail);
        }
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your credentials and try again.");
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 flex flex-col">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-200 mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Finance Buddy</h2>
          <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">Secure Personal Workspace</p>
        </div>

        {isPreviewEnabled && (
          <div className="text-center bg-blue-100 text-blue-800 text-[10px] font-extrabold px-3 py-1.5 rounded-xl mb-4 uppercase tracking-wider">
            DEVELOPMENT PREVIEW MODE ACTIVE
          </div>
        )}

        {/* Info alerts */}
        {!isSupabaseConfigured && (
          <div className="mb-4 bg-amber-50 border border-amber-100 text-amber-800 text-[11px] rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-normal">
                <span className="font-bold">Database Mode:</span> Local Sandbox. Sign-up requires configuring database keys. {isPreviewEnabled && "Click the Easy Demo Entry below to enter instantly!"}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs between Log In & Sign Up */}
        {(view === "login" || view === "register") && (
          <div className="flex border-b border-slate-100 mb-5">
            <button
              onClick={() => {
                setView("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                view === "login"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setView("register");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                view === "register"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign Up / Register
            </button>
          </div>
        )}

        {view === "login" && (
          <div className="space-y-4">
            {/* Quick Demo Login Option */}
            {isPreviewEnabled && (
              <>
                <div className="p-4 bg-blue-50/50 border border-blue-100/60 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 text-blue-800">
                    <RefreshCw className={`h-4.5 w-4.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
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

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 leading-relaxed">
              Create a personalized, isolated database environment to securely budget, manage accounts, and build general balance sheets.
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Create password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
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
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
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
  );
};
