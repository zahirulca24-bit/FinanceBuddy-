import React, { useState } from "react";
import { FinanceProvider, useFinance } from "./context/FinanceContext";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { AddTransactionView } from "./components/AddTransactionView";
import { AccountsView } from "./components/AccountsView";
import { CategoriesView } from "./components/CategoriesView";
import { AccountingView } from "./components/AccountingView";
import { ReportsView } from "./components/ReportsView";
import { ReconciliationView } from "./components/ReconciliationView";
import { TaxCalculationView } from "./components/TaxCalculationView";
import { AIAdviserView } from "./components/AIAdviserView";
import { AuthView } from "./components/AuthView";
import { DebtManagementView } from "./components/DebtManagementView";
import { CurrencyView } from "./components/CurrencyView";
import { SystemManagementView } from "./components/SystemManagementView";
import { TaxProvider } from "./context/TaxContext";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading, reloadData } = useFinance();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Centers loading spinner during initial state fetches
  if (loading) {
    return (
      <div id="splash-loader" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="bg-white p-6 rounded-2xl border border-blue-50 shadow-md flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
          <span className="text-xs font-semibold text-gray-700 font-sans">
            Loading Ledger Workspace...
          </span>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Finance Buddy</p>
        </div>
      </div>
    );
  }

  // If no authenticated user is present, redirect to the secure single-user Login portal
  if (!user) {
    return <AuthView onSessionEstablished={reloadData} />;
  }

  // Render the current view based on selection
  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onNavigate={setActiveTab} />;
      case "add":
        return <AddTransactionView />;
      case "accounts":
        return <AccountsView />;
      case "debt":
        return <DebtManagementView />;
      case "categories":
        return <CategoriesView />;
      case "accounting":
        return <AccountingView />;
      case "reconciliation":
        return <ReconciliationView />;
      case "tax":
        return <TaxCalculationView />;
      case "reports":
        return <ReportsView />;
      case "currencies":
        return <CurrencyView />;
      case "adviser":
        return <AIAdviserView onNavigate={setActiveTab} />;
      case "system":
        return <SystemManagementView />;
      default:
        return <DashboardView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 flex flex-col md:flex-row">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Content Container & Footer */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderActiveView()}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-blue-50 py-4 text-center text-[10px] text-gray-400 font-mono print:hidden mt-auto">
          <span>© 2026 Finance Buddy • Double-entry General Ledger Security Verified</span>
        </footer>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <FinanceProvider>
      <TaxProvider>
        <AppContent />
      </TaxProvider>
    </FinanceProvider>
  );
}
