import React, { useState } from "react";
import { 
  Wallet, 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  CreditCard, 
  Coins, 
  Tag, 
  BookOpen, 
  CheckSquare, 
  Calculator, 
  PieChart, 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  Menu, 
  X
} from "lucide-react";
import { supabase } from "../supabase";
import { useFinance } from "../context/FinanceContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useFinance();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "add", label: "Add Transaction", icon: PlusCircle },
    { id: "accounts", label: "Accounts", icon: CreditCard },
    { id: "debt", label: "Debt Management", icon: Coins },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "accounting", label: "Accounting Books", icon: BookOpen },
    { id: "reconciliation", label: "Bank Reconciliation", icon: CheckSquare },
    { id: "tax", label: "Tax Calculation", icon: Calculator },
    { id: "reports", label: "Reports", icon: PieChart },
    { id: "currencies", label: "Currencies", icon: Globe },
    { id: "adviser", label: "AI Adviser", icon: Sparkles },
    { id: "system", label: "Admin Tools", icon: ShieldCheck }
  ];

  const handleLogout = async () => {
    if (user?.role === "preview-admin") {
      try {
        await fetch("/api/preview-session/logout", { method: "POST", credentials: "same-origin" });
      } catch (e) {
        console.error("Failed to sign out from preview session:", e);
      }
      window.location.reload();
    } else {
      await supabase.auth.signOut();
    }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden bg-blue-800 text-white h-16 px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-3" onClick={() => setActiveTab("dashboard")}>
          <div className="bg-white text-blue-800 p-1.5 rounded flex items-center justify-center shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-sans font-bold text-base text-white tracking-tight">
            Finance Buddy
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg bg-blue-900/40 border border-blue-700/60 text-white hover:bg-blue-900/60 focus:outline-none transition-all cursor-pointer"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800/60 shadow-xl transition-transform duration-300 transform md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header with Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => handleNavClick("dashboard")}
          >
            <div className="bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-sm tracking-tight text-white leading-none">
                Finance Buddy
              </span>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5">GENERAL LEDGER</span>
            </div>
          </div>
          
          {/* Close button for mobile inside sidebar */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items - Scrollable */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer text-left group ${
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <IconComponent className={`h-4.5 w-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                }`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Area with workspace indicator & logout button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          {user?.role === "preview-admin" ? (
            <div className="flex flex-col gap-1 px-2.5 py-2 bg-amber-950/30 rounded-xl border border-amber-800/40">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-mono text-amber-400 font-bold tracking-wider">DEV PREVIEW ACTIVE</span>
              </div>
              <span className="text-[8px] text-amber-500/80 font-mono">Sandbox Local Database Mode</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-2.5 py-2 bg-slate-900/60 rounded-xl border border-slate-800/50">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">SECURE WORKSPACE</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-950/20 hover:bg-rose-700/80 hover:text-white text-rose-400 border border-rose-950/40 hover:border-rose-600/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer shadow-inner"
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </button>
        </div>
      </aside>
    </>
  );
};
