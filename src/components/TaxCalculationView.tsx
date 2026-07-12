import React, { useState, useEffect } from "react";
import { useFinance } from "../context/FinanceContext";
import { useTax } from "../context/TaxContext";
import {
  TaxProfile,
  TaxConfiguration,
  TaxCalculationRecord,
  TaxIncomeItem,
  SalaryTaxDetails,
  TaxDeduction,
  TaxExemptIncome,
  TaxPaidItem,
  TaxSlabBreakdown,
  Transaction
} from "../types";
import {
  FileText,
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
  Info,
  User,
  ShieldAlert,
  Save,
  CheckCircle,
  Copy,
  AlertTriangle,
  FileDown,
  History,
  TrendingUp,
  Edit,
  Eye,
  Minimize2
} from "lucide-react";

export const TaxCalculationView: React.FC = () => {
  const { transactions } = useFinance();
  const {
    taxProfiles,
    taxConfigurations,
    taxCalculations,
    loading: taxLoading,
    addTaxProfile,
    updateTaxProfile,
    deleteTaxProfile,
    addTaxConfiguration,
    updateTaxConfiguration,
    activateTaxConfiguration,
    addTaxCalculation,
    updateTaxCalculation,
    deleteTaxCalculation
  } = useTax();

  // Active sub-tabs inside Tax Calculation module
  // "dashboard" | "profile" | "income" | "deductions" | "exemptions" | "paid" | "settings" | "history" | "statement"
  const [activeSubTab, setActiveSubTab] = useState<string>("dashboard");

  // Selection state
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>("2025-2026");
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [activeCalculationId, setActiveCalculationId] = useState<string>("");

  // Edit states for Taxpayer Profile
  const [profileName, setProfileName] = useState("");
  const [profileTin, setProfileTin] = useState("");
  const [profileResidency, setProfileResidency] = useState<"Resident" | "Non-Resident">("Resident");
  const [profileGender, setProfileGender] = useState<any>("General");
  const [profileDob, setProfileDob] = useState("");
  const [profileEmployment, setProfileEmployment] = useState("");
  const [profileIncomeSource, setProfileIncomeSource] = useState("");
  const [profileJurisdiction, setProfileJurisdiction] = useState<any>("Dhaka/Chittagong City");
  const [profileNotes, setProfileNotes] = useState("");

  // Active Draft calculation states
  const [incomeItems, setIncomeItems] = useState<TaxIncomeItem[]>([]);
  const [salaryDetails, setSalaryDetails] = useState<SalaryTaxDetails>({
    basicSalary: 0,
    houseRentAllowance: 0,
    medicalAllowance: 0,
    conveyanceAllowance: 0,
    bonus: 0,
    employerContribution: 0,
    employeeContribution: 0,
    otherBenefits: 0,
    taxExemptAllowancePortion: 0,
    mappedTransactionIds: []
  });
  const [deductions, setDeductions] = useState<TaxDeduction[]>([]);
  const [exemptIncomes, setExemptIncomes] = useState<TaxExemptIncome[]>([]);
  const [taxPaidItems, setTaxPaidItems] = useState<TaxPaidItem[]>([]);
  const [calculationNotes, setCalculationNotes] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [auditTrail, setAuditTrail] = useState<{ action: string; timestamp: string; notes?: string }[]>([]);

  // Manual configuration builder states
  const [configTaxYear, setConfigTaxYear] = useState("2025-2026");
  const [configFreeThreshold, setConfigFreeThreshold] = useState(350000);
  const [configFemaleThreshold, setConfigFemaleThreshold] = useState(400000);
  const [configSeniorThreshold, setConfigSeniorThreshold] = useState(400000);
  const [configDisabledThreshold, setConfigDisabledThreshold] = useState(475000);
  const [configFFThreshold, setConfigFFThreshold] = useState(500000);
  const [configMinTaxDhaka, setConfigMinTaxDhaka] = useState(5000);
  const [configMinTaxCity, setConfigMinTaxCity] = useState(4000);
  const [configMinTaxOutside, setConfigMinTaxOutside] = useState(3000);
  const [configRebateRate, setConfigRebateRate] = useState(15);
  const [configRebatePercentOfInc, setConfigRebatePercentOfInc] = useState(3);
  const [configMaxRebate, setConfigMaxRebate] = useState(150000);
  const [configRounding, setConfigRounding] = useState<any>("Nearest 10");
  const [configSlabs, setConfigSlabs] = useState<any[]>([
    { min: 0, max: 350000, rate: 0 },
    { min: 350000, max: 450000, rate: 5 },
    { min: 450000, max: 750000, rate: 10 },
    { min: 750000, max: 1150000, rate: 15 },
    { min: 1150000, max: 1650000, rate: 20 },
    { min: 1650000, max: null, rate: 25 }
  ]);
  const [wealthSurchargePercent, setWealthSurchargePercent] = useState<number>(0); // e.g. 10%
  const [additionalTaxInput, setAdditionalTaxInput] = useState<number>(0);

  // Quick modals and subforms
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [selectedImportTxIds, setSelectedImportTxIds] = useState<string[]>([]);
  const [importCategoryMapping, setImportCategoryMapping] = useState<string>("Salary");

  const [showConfigConfirm, setShowConfigConfirm] = useState<string | null>(null);

  // Initialize/Set Active taxpayer profile on load
  useEffect(() => {
    if (taxProfiles.length > 0) {
      const active = taxProfiles[0];
      setActiveProfileId(active.id);
      setProfileName(active.taxpayerName);
      setProfileTin(active.tin);
      setProfileResidency(active.residencyStatus);
      setProfileGender(active.genderCategory);
      setProfileDob(active.dateOfBirth);
      setProfileEmployment(active.employmentStatus);
      setProfileIncomeSource(active.mainSourceOfIncome);
      setProfileJurisdiction(active.taxJurisdiction);
      setProfileNotes(active.notes || "");
    } else {
      // Setup pristine details for first profile creation
      setActiveProfileId("");
      setProfileName("");
      setProfileTin("");
      setProfileResidency("Resident");
      setProfileGender("General");
      setProfileDob("1988-06-15");
      setProfileEmployment("Private Job Holder");
      setProfileIncomeSource("Salary");
      setProfileJurisdiction("Dhaka/Chittagong City");
      setProfileNotes("");
    }
  }, [taxProfiles]);

  // Load calculation if selected or find current draft for active profile & tax year
  useEffect(() => {
    if (activeProfileId && selectedTaxYear) {
      const calc = taxCalculations.find(
        (c) => c.profileId === activeProfileId && c.taxYear === selectedTaxYear && c.status !== "Finalized"
      );
      if (calc) {
        setActiveCalculationId(calc.id);
        setIncomeItems(calc.incomeItems || []);
        setSalaryDetails(calc.salaryDetails || {
          basicSalary: 0,
          houseRentAllowance: 0,
          medicalAllowance: 0,
          conveyanceAllowance: 0,
          bonus: 0,
          employerContribution: 0,
          employeeContribution: 0,
          otherBenefits: 0,
          taxExemptAllowancePortion: 0,
          mappedTransactionIds: []
        });
        setDeductions(calc.deductions || []);
        setExemptIncomes(calc.exemptIncomes || []);
        setTaxPaidItems(calc.taxPaidItems || []);
        setCalculationNotes(calc.notes || "");
        setAssumptions(calc.assumptions || "");
        setPreparedBy(calc.preparedBy || "Self");
        setAuditTrail(calc.auditTrail || []);
      } else {
        // Reset to pristine states for new draft creation
        setActiveCalculationId("");
        setIncomeItems([]);
        setSalaryDetails({
          basicSalary: 0,
          houseRentAllowance: 0,
          medicalAllowance: 0,
          conveyanceAllowance: 0,
          bonus: 0,
          employerContribution: 0,
          employeeContribution: 0,
          otherBenefits: 0,
          taxExemptAllowancePortion: 0,
          mappedTransactionIds: []
        });
        setDeductions([]);
        setExemptIncomes([]);
        setTaxPaidItems([]);
        setCalculationNotes("");
        setAssumptions("");
        setPreparedBy("Self");
        setAuditTrail([{ action: "Initialized Draft Calculation", timestamp: new Date().toISOString() }]);
      }
    }
  }, [activeProfileId, selectedTaxYear, taxCalculations]);

  // Helper: Format Currency BDT (৳)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT"
    }).format(val).replace("BDT", "৳");
  };

  // Safe manual parse helper
  const parseNum = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  // CALCULATE TAX LIABILITIES ENTIRE ENGINE (VIRTUAL / REALTIME)
  const getActiveTaxConfig = (): TaxConfiguration | undefined => {
    // Return active tax config for year, or default if missing
    const config = taxConfigurations.find((c) => c.taxYear === selectedTaxYear && c.isActive);
    if (config) return config;
    return taxConfigurations.find((c) => c.taxYear === selectedTaxYear);
  };

  const calculateTaxEngine = () => {
    const config = getActiveTaxConfig();
    const activeProfile = taxProfiles.find(p => p.id === activeProfileId);

    // 1. Compute Incomes
    // Salary taxable amount details calculation
    const basic = parseNum(salaryDetails.basicSalary);
    const houseRent = parseNum(salaryDetails.houseRentAllowance);
    const medical = parseNum(salaryDetails.medicalAllowance);
    const conveyance = parseNum(salaryDetails.conveyanceAllowance);
    const bonus = parseNum(salaryDetails.bonus);
    const empContrib = parseNum(salaryDetails.employerContribution);
    const otherBenefits = parseNum(salaryDetails.otherBenefits);

    // Exemption logic helper
    // Standard BD Exemptions rules can be overridden or calculated. We let the user specify taxExemptAllowancePortion or calculate
    let calculatedSalaryExemption = parseNum(salaryDetails.taxExemptAllowancePortion);
    if (calculatedSalaryExemption === 0) {
      // Estimate based on standard rules:
      // House Rent: lower of 50% basic or 25,000/month (300,000/year)
      const hrExempt = Math.min(basic * 0.5, 300000);
      // Medical: lower of 10% basic or 120,000/year
      const medExempt = Math.min(basic * 0.1, 120000);
      // Conveyance: flat 30,000/year
      const convExempt = 30000;
      calculatedSalaryExemption = Math.min(houseRent, hrExempt) + Math.min(medical, medExempt) + Math.min(conveyance, convExempt);
    }

    const totalSalaryGross = basic + houseRent + medical + conveyance + bonus + empContrib + otherBenefits;
    const taxableSalary = Math.max(0, totalSalaryGross - calculatedSalaryExemption);

    // Dynamic items combined
    let totalOtherIncome = 0;
    incomeItems.forEach((item) => {
      if (!item.isExcluded) {
        if (item.category === "Salary" || item.category === "Bonus & Allowances") {
          // Handled separately or mapped, skip if we already do detailed salary, unless not mapped
          if (salaryDetails.mappedTransactionIds.length === 0) {
            totalOtherIncome += parseNum(item.amount);
          }
        } else {
          totalOtherIncome += parseNum(item.amount);
        }
      }
    });

    const grossTotalIncome = taxableSalary + totalOtherIncome;

    // 2. Exempt Incomes
    const totalExemptIncome = exemptIncomes.reduce((sum, item) => sum + parseNum(item.exemptAmount), 0);

    // 3. Allowable Deductions
    const totalAllowableDeductions = deductions
      .filter((d) => d.eligibilityStatus === "Eligible")
      .reduce((sum, d) => sum + parseNum(d.amount), 0);

    // 4. Taxable Income
    const taxableIncome = Math.max(0, grossTotalIncome - totalAllowableDeductions);

    // 5. Threshold Resolution
    let threshold = config?.taxFreeThreshold || 350000;
    if (activeProfile && config) {
      if (activeProfile.genderCategory === "Female") threshold = config.specialThresholds.female;
      else if (activeProfile.genderCategory === "Senior (65+)") threshold = config.specialThresholds.senior;
      else if (activeProfile.genderCategory === "Person with Disability") threshold = config.specialThresholds.disabled;
      else if (activeProfile.genderCategory === "Freedom Fighter") threshold = config.specialThresholds.freedomFighter;
    }

    // 6. Slab-wise tax liability
    let remainingTaxable = taxableIncome;
    const slabWiseCalculations: TaxSlabBreakdown[] = [];
    let grossTaxLiability = 0;

    if (config && config.slabs && config.slabs.length > 0) {
      // Re-map slabs dynamically where the first slab width corresponds exactly to the resolved tax-free threshold
      const sortedSlabs = [...config.slabs].sort((a, b) => a.min - b.min);
      const dynamicSlabs: any[] = [];
      
      let runningOffset = 0;
      sortedSlabs.forEach((s, idx) => {
        if (idx === 0) {
          dynamicSlabs.push({ min: 0, max: threshold, rate: 0 });
          runningOffset = threshold;
        } else {
          const originalWidth = s.max === null ? null : s.max - s.min;
          const newMin = runningOffset;
          const newMax = originalWidth === null ? null : runningOffset + originalWidth;
          dynamicSlabs.push({ min: newMin, max: newMax, rate: s.rate });
          if (originalWidth !== null) {
            runningOffset += originalWidth;
          }
        }
      });

      dynamicSlabs.forEach((slab) => {
        if (remainingTaxable <= 0) {
          slabWiseCalculations.push({
            slabMin: slab.min,
            slabMax: slab.max,
            rate: slab.rate,
            taxableInThisSlab: 0,
            taxAmount: 0
          });
          return;
        }

        const limit = slab.max === null ? Infinity : slab.max - slab.min;
        const taxableInSlab = Math.min(remainingTaxable, limit);
        const taxInSlab = (taxableInSlab * slab.rate) / 100;

        slabWiseCalculations.push({
          slabMin: slab.min,
          slabMax: slab.max,
          rate: slab.rate,
          taxableInThisSlab: taxableInSlab,
          taxAmount: taxInSlab
        });

        grossTaxLiability += taxInSlab;
        remainingTaxable -= taxableInSlab;
      });
    } else {
      // Fallback simple 10% rate if no slabs loaded
      grossTaxLiability = taxableIncome > threshold ? (taxableIncome - threshold) * 0.1 : 0;
    }

    // 7. Investment Rebate
    // Approved investments & insurances & pension from deductions
    const eligibleInvestmentForRebate = deductions
      .filter((d) => d.eligibilityStatus === "Eligible" && 
        (d.category === "Approved investment" || 
         d.category === "Insurance premium" || 
         d.category === "Retirement or pension contribution"))
      .reduce((sum, d) => sum + parseNum(d.amount), 0);

    let calculatedRebate = 0;
    if (config) {
      // Rebate is usually 15% of actual investment, capped at maxRebateLimit or 3% of taxable income
      const actualInvestmentRebate = (eligibleInvestmentForRebate * config.investmentRebateRate) / 100;
      const taxableIncomeRebateCap = (taxableIncome * config.rebatePercentageOfIncome) / 100;
      calculatedRebate = Math.min(actualInvestmentRebate, taxableIncomeRebateCap, config.maxRebateLimit);
    }

    let netTaxLiability = Math.max(0, grossTaxLiability - calculatedRebate);

    // 8. Minimum Tax check
    let minimumTaxApplied = 0;
    if (taxableIncome > threshold && netTaxLiability > 0 && config) {
      let minTaxTarget = config.minimumTax.outsideCity;
      if (activeProfile?.taxJurisdiction === "Dhaka/Chittagong City") {
        minTaxTarget = config.minimumTax.dhakaChittagong;
      } else if (activeProfile?.taxJurisdiction === "Other City Corporation") {
        minTaxTarget = config.minimumTax.otherCity;
      }

      if (netTaxLiability < minTaxTarget) {
        minimumTaxApplied = minTaxTarget - netTaxLiability;
        netTaxLiability = minTaxTarget;
      }
    }

    // 9. Surcharge (Net wealth based or flat manual adjusting)
    const surchargeAmount = (netTaxLiability * wealthSurchargePercent) / 100;
    netTaxLiability += surchargeAmount;

    // 10. Additional Tax
    const additionalTax = parseNum(additionalTaxInput);
    netTaxLiability += additionalTax;

    // 11. Settle Paid Adjustments
    const totalTaxPaid = taxPaidItems.reduce((sum, item) => sum + parseNum(item.amount), 0);
    const netTaxPayable = Math.max(0, netTaxLiability - totalTaxPaid);
    const taxRefundable = totalTaxPaid > netTaxLiability ? totalTaxPaid - netTaxLiability : 0;

    // 12. Rounding
    let roundedNetLiability = netTaxLiability;
    let roundedNetPayable = netTaxPayable;
    let roundedRefundable = taxRefundable;

    if (config) {
      const applyRounding = (val: number) => {
        if (config.roundingRule === "Nearest 10") return Math.round(val / 10) * 10;
        if (config.roundingRule === "Nearest 100") return Math.round(val / 100) * 100;
        return Math.round(val);
      };
      roundedNetLiability = applyRounding(netTaxLiability);
      roundedNetPayable = Math.max(0, roundedNetLiability - totalTaxPaid);
      roundedRefundable = totalTaxPaid > roundedNetLiability ? totalTaxPaid - roundedNetLiability : 0;
    }

    const effectiveTaxRate = taxableIncome > 0 ? (roundedNetLiability / taxableIncome) * 100 : 0;

    return {
      grossTotalIncome,
      totalExemptIncome,
      totalAllowableDeductions,
      taxableIncome,
      slabWiseCalculations,
      grossTaxLiability,
      eligibleInvestmentForRebate,
      calculatedRebate,
      surchargeAmount,
      minimumTaxApplied,
      additionalTax,
      netTaxLiability: roundedNetLiability,
      totalTaxPaid,
      netTaxPayable: roundedNetPayable,
      taxRefundable: roundedRefundable,
      effectiveTaxRate
    };
  };

  const currentSummary = calculateTaxEngine();

  // ACTIONS
  // 1. Maintain taxpayer profile
  const handleSaveProfile = async () => {
    if (!profileName) {
      alert("Taxpayer Name is required.");
      return;
    }

    const data = {
      taxpayerName: profileName,
      tin: profileTin,
      taxYear: selectedTaxYear,
      assessmentYear: selectedTaxYear.split("-").map(y => parseInt(y) + 1).join("-"),
      residencyStatus: profileResidency,
      genderCategory: profileGender,
      dateOfBirth: profileDob,
      employmentStatus: profileEmployment,
      mainSourceOfIncome: profileIncomeSource,
      taxJurisdiction: profileJurisdiction,
      notes: profileNotes
    };

    try {
      if (activeProfileId) {
        await updateTaxProfile(activeProfileId, data);
        alert("Tax Profile updated successfully.");
      } else {
        const pId = await addTaxProfile(data);
        setActiveProfileId(pId);
        alert("Tax Profile created successfully.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save Tax Profile.");
    }
  };

  // 2. Draft save & Reopen
  const handleSaveCalculationDraft = async (status: "Draft" | "Under Review" | "Finalized" = "Draft") => {
    if (!activeProfileId) {
      alert("Please save your taxpayer profile details first.");
      return;
    }

    const activeConfig = getActiveTaxConfig();
    if (!activeConfig) {
      alert("Please configure or activate a tax year rules setup first.");
      return;
    }

    const currentProfile = taxProfiles.find((p) => p.id === activeProfileId);
    if (!currentProfile) return;

    // Construct full audit entry
    const newAudit = [...auditTrail, {
      action: `Saved calculation as ${status}`,
      timestamp: new Date().toISOString(),
      notes: calculationNotes
    }];

    const data: Omit<TaxCalculationRecord, "id" | "userId" | "createdDate"> = {
      taxYear: selectedTaxYear,
      assessmentYear: selectedTaxYear.split("-").map(y => parseInt(y) + 1).join("-"),
      profileId: activeProfileId,
      profile: currentProfile,
      status,
      version: activeCalculationId ? (taxCalculations.find(c => c.id === activeCalculationId)?.version || 1) : 1,
      incomeItems,
      salaryDetails,
      deductions,
      exemptIncomes,
      taxPaidItems,
      taxConfigUsed: activeConfig,
      summary: currentSummary,
      notes: calculationNotes,
      preparedBy,
      preparationDate: new Date().toISOString().split("T")[0],
      assumptions,
      auditTrail: newAudit
    };

    try {
      if (activeCalculationId) {
        await updateTaxCalculation(activeCalculationId, data);
        alert(`Tax Calculation saved successfully as ${status}!`);
      } else {
        const id = await addTaxCalculation(data);
        setActiveCalculationId(id);
        alert(`Tax Calculation draft generated and saved successfully!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save Tax Calculation record.");
    }
  };

  // Create Revised Version without overwriting
  const handleCreateRevisedVersion = async () => {
    if (!activeCalculationId) return;
    const currentRecord = taxCalculations.find(c => c.id === activeCalculationId);
    if (!currentRecord) return;

    const nextVer = (currentRecord.version || 1) + 1;
    const activeConfig = getActiveTaxConfig();
    const currentProfile = taxProfiles.find((p) => p.id === activeProfileId);
    if (!activeConfig || !currentProfile) return;

    const newAudit = [...auditTrail, {
      action: `Created Revised Version ${nextVer}`,
      timestamp: new Date().toISOString(),
      notes: `Revision based on previous version ${currentRecord.version}`
    }];

    const newData: Omit<TaxCalculationRecord, "id" | "userId" | "createdDate"> = {
      taxYear: selectedTaxYear,
      assessmentYear: selectedTaxYear.split("-").map(y => parseInt(y) + 1).join("-"),
      profileId: activeProfileId,
      profile: currentProfile,
      status: "Draft",
      version: nextVer,
      incomeItems,
      salaryDetails,
      deductions,
      exemptIncomes,
      taxPaidItems,
      taxConfigUsed: activeConfig,
      summary: currentSummary,
      notes: `Revised Version ${nextVer}`,
      preparedBy,
      preparationDate: new Date().toISOString().split("T")[0],
      assumptions,
      auditTrail: newAudit
    };

    try {
      const newId = await addTaxCalculation(newData);
      setActiveCalculationId(newId);
      alert(`Revised version ${nextVer} initialized successfully in your history logs.`);
    } catch (err) {
      console.error(err);
      alert("Failed to initialize revised version.");
    }
  };

  // Finalize Record
  const handleFinalizeCalculation = async () => {
    if (Math.abs(currentSummary.netTaxPayable - 0) > 0 && taxPaidItems.length === 0) {
      const confirmFinal = confirm("You have net tax payable outstanding but no tax payment records logged. Do you still want to finalize this statement?");
      if (!confirmFinal) return;
    }

    const confirmFinalize = confirm("Once finalized, this tax calculation audit trail will close. Are you sure you wish to lock this version?");
    if (!confirmFinalize) return;

    await handleSaveCalculationDraft("Finalized");
    setActiveSubTab("statement");
  };

  // INCOME IMPORT MODAL LOGIC
  const getEligibleImportTransactions = (): Transaction[] => {
    return transactions.filter((tx) => {
      // Must be an income transaction
      if (tx.type !== "Income") return false;

      // Ensure it is not already imported to avoid duplicate entries
      const alreadyImported = incomeItems.some(item => item.sourceTransactionId === tx.id);
      if (alreadyImported) return false;

      // Text search
      if (importSearch) {
        const query = importSearch.toLowerCase();
        return (
          tx.description.toLowerCase().includes(query) ||
          tx.category.toLowerCase().includes(query) ||
          (tx.referenceNumber || "").toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  const handleImportTransactions = () => {
    const eligible = getEligibleImportTransactions();
    const toImport = eligible.filter(tx => selectedImportTxIds.includes(tx.id));

    const newItems: TaxIncomeItem[] = toImport.map((tx) => ({
      id: `imported-${tx.id}-${Date.now()}`,
      category: (tx.category === "Salary" ? "Salary" : "Other") as any,
      description: tx.description,
      amount: tx.amount,
      isImported: true,
      sourceTransactionId: tx.id,
      notes: `Imported from general ledger. Category: ${tx.category}, Date: ${tx.date}`,
      referenceNumber: tx.referenceNumber || "",
      isExcluded: false
    }));

    setIncomeItems([...incomeItems, ...newItems]);

    // Track Audit Log
    setAuditTrail([...auditTrail, {
      action: "Imported Transactions from Ledger",
      timestamp: new Date().toISOString(),
      notes: `Imported ${toImport.length} incomes. Original values preserved.`
    }]);

    // If salary category and detailed salary is empty, try mapping to Basic Salary/Bonus
    const salaryIncomes = toImport.filter(tx => tx.category === "Salary");
    if (salaryIncomes.length > 0) {
      const totalSal = salaryIncomes.reduce((sum, tx) => sum + tx.amount, 0);
      setSalaryDetails({
        ...salaryDetails,
        basicSalary: salaryDetails.basicSalary + totalSal,
        mappedTransactionIds: [...salaryDetails.mappedTransactionIds, ...salaryIncomes.map(s => s.id)]
      });
    }

    setSelectedImportTxIds([]);
    setShowImportModal(false);
  };

  // CONFIGURATION COPY previous rules
  const handleCopyConfigFromPrevious = (prevId: string) => {
    const prev = taxConfigurations.find(c => c.id === prevId);
    if (!prev) return;

    setConfigFreeThreshold(prev.taxFreeThreshold);
    setConfigFemaleThreshold(prev.specialThresholds.female);
    setConfigSeniorThreshold(prev.specialThresholds.senior);
    setConfigDisabledThreshold(prev.specialThresholds.disabled);
    setConfigFFThreshold(prev.specialThresholds.freedomFighter);
    setConfigMinTaxDhaka(prev.minimumTax.dhakaChittagong);
    setConfigMinTaxCity(prev.minimumTax.otherCity);
    setConfigMinTaxOutside(prev.minimumTax.outsideCity);
    setConfigRebateRate(prev.investmentRebateRate);
    setConfigRebatePercentOfInc(prev.rebatePercentageOfIncome);
    setConfigMaxRebate(prev.maxRebateLimit);
    setConfigRounding(prev.roundingRule);
    setConfigSlabs([...prev.slabs]);
    alert(`Configuration values successfully copied from previous Year: ${prev.taxYear}. Please review and save.`);
  };

  // SAVE CUSTOM CONFIG
  const handleSaveTaxConfig = async () => {
    const data = {
      taxYear: configTaxYear,
      isActive: false, // Save as inactive draft first. Activates upon separate confirmation
      taxFreeThreshold: configFreeThreshold,
      specialThresholds: {
        female: configFemaleThreshold,
        senior: configSeniorThreshold,
        disabled: configDisabledThreshold,
        freedomFighter: configFFThreshold
      },
      minimumTax: {
        dhakaChittagong: configMinTaxDhaka,
        otherCity: configMinTaxCity,
        outsideCity: configMinTaxOutside
      },
      investmentRebateRate: configRebateRate,
      rebatePercentageOfIncome: configRebatePercentOfInc,
      maxRebateLimit: configMaxRebate,
      surchargeRates: [
        { minWealth: 0, rate: 0 },
        { minWealth: 4000000, rate: 10 },
        { minWealth: 10000000, rate: 20 },
        { minWealth: 20000000, rate: 30 }
      ],
      roundingRule: configRounding,
      slabs: configSlabs
    };

    try {
      await addTaxConfiguration(data);
      alert(`Tax configuration for Year ${configTaxYear} saved successfully as inactive. Complete activation in the rules checklist.`);
    } catch (err) {
      console.error(err);
      alert("Failed to save tax configuration.");
    }
  };

  // REVIEW & VALIDATION RULES Checklist
  const getValidationWarnings = () => {
    const warnings: string[] = [];

    // Profile checks
    if (!profileName) warnings.push("Taxpayer Name is empty.");
    if (!profileTin) warnings.push("Taxpayer Identification Number (TIN) is missing.");
    if (!profileDob) warnings.push("Taxpayer Date of Birth is missing.");

    // Config checks
    const activeConfig = getActiveTaxConfig();
    if (!activeConfig) {
      warnings.push("Active tax rules configuration for this year is missing. Please activate a configuration.");
    }

    // Unclassified incomes checks (where notes are missing)
    incomeItems.forEach((item, idx) => {
      if (!item.isExcluded && item.category === "Other" && !item.notes) {
        warnings.push(`Income item #${idx + 1} ("${item.description}") is marked as "Other" without notes.`);
      }
    });

    // Deductions missing details
    deductions.forEach((d, idx) => {
      if (d.eligibilityStatus === "Eligible" && (!d.supportingNote && !d.attachmentRef)) {
        warnings.push(`Deduction #${idx + 1} ("${d.description}") is set to Eligible without supporting note/ref.`);
      }
    });

    // Duplicates inside incomes
    const seenNames: Record<string, boolean> = {};
    incomeItems.forEach((item) => {
      const key = `${item.description.toLowerCase()}-${item.amount}`;
      if (seenNames[key]) {
        warnings.push(`Potential duplicate income entry detected: "${item.description}" for ${formatCurrency(item.amount)}.`);
      }
      seenNames[key] = true;
    });

    // Suspicious transfer checks (warnings for potential non-income receipts)
    incomeItems.forEach((item) => {
      if (!item.isExcluded) {
        const descLower = item.description.toLowerCase();
        if (descLower.includes("transfer") || descLower.includes("loan") || descLower.includes("bKash cash out") || descLower.includes("nagad cash out")) {
          warnings.push(`Suspicious Transfer/Cash-Out "${item.description}" mapped as taxable income. Exclude if personal transfer.`);
        }
      }
    });

    return warnings;
  };

  const validationWarnings = getValidationWarnings();

  // EXPORT LOGIC
  const exportExcelCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "TAX COMPUTATION SCHEDULE STATEMENT\n";
    csvContent += `Taxpayer,${profileName || "N/A"}\n`;
    csvContent += `TIN,${profileTin || "N/A"}\n`;
    csvContent += `Tax Year,${selectedTaxYear}\n`;
    csvContent += `Jurisdiction,${profileJurisdiction}\n\n`;

    csvContent += "INCOME SUMMARY SCHEDULE\n";
    csvContent += "Category,Description,Gross Amount,Taxable Portion\n";
    csvContent += `Salary,Detailed Salary,${currentSummary.grossTotalIncome},${currentSummary.grossTotalIncome}\n`;
    incomeItems.forEach((item) => {
      if (!item.isExcluded) {
        csvContent += `${item.category},"${item.description}",${item.amount},${item.isExcluded ? 0 : item.amount}\n`;
      }
    });
    csvContent += `\nGROSS TOTAL INCOME,${currentSummary.grossTotalIncome}\n\n`;

    csvContent += "DEDUCTION SCHEDULE\n";
    csvContent += "Category,Description,Amount,Eligibility\n";
    deductions.forEach((d) => {
      csvContent += `${d.category},"${d.description}",${d.amount},${d.eligibilityStatus}\n`;
    });
    csvContent += `\nTOTAL ALLOWABLE DEDUCTIONS,${currentSummary.totalAllowableDeductions}\n\n`;

    csvContent += "TAX LIABILITY CALCULATION DETAIL\n";
    csvContent += `Taxable Income,${currentSummary.taxableIncome}\n`;
    csvContent += `Gross Slab Tax Liability,${currentSummary.grossTaxLiability}\n`;
    csvContent += `Investment Rebate,${currentSummary.calculatedRebate}\n`;
    csvContent += `Surcharge,${currentSummary.surchargeAmount}\n`;
    csvContent += `Minimum Tax Adjustment,${currentSummary.minimumTaxApplied}\n`;
    csvContent += `NET TAX LIABILITY,${currentSummary.netTaxLiability}\n`;
    csvContent += `Total Tax Paid / TDS,${currentSummary.totalTaxPaid}\n`;
    csvContent += `NET TAX PAYABLE,${currentSummary.netTaxPayable}\n`;
    csvContent += `REFUNDABLE,${currentSummary.taxRefundable}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tax_Computation_${profileName || "Taxpayer"}_${selectedTaxYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Top Notification */}
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start space-x-3 text-xs text-amber-800 shadow-sm print:hidden">
        <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Estimated Tax Calculation Disclaimer:</span> All computations, slabs, rates, and outcomes are provided strictly as estimations based on the rules entered below. This application does not present itself as a replacement for, or advice from, a licensed tax professional or certified public accountant. Validate with official government filings before submitting any tax returns.
        </div>
      </div>

      {/* Primary Top Header Area */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 text-blue-800 p-2.5 rounded-lg border border-blue-100 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tax Year: {selectedTaxYear}</h3>
            <p className="text-[11px] text-slate-400 font-mono">Assessment Year: {selectedTaxYear.split("-").map(y => parseNum(y) + 1).join("-")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Taxpayer Profile</label>
            <select
              value={activeProfileId}
              onChange={(e) => setActiveProfileId(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Choose Profile --</option>
              {taxProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.taxpayerName} (TIN: {p.tin})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fiscal Year</label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 bg-white font-mono"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          <div className="pt-5">
            <button
              onClick={() => handleSaveCalculationDraft("Draft")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm cursor-pointer flex items-center space-x-1.5 transition"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-1 scrollbar-none print:hidden">
        {[
          { id: "dashboard", label: "Overview", icon: Layers },
          { id: "profile", label: "Tax Profile", icon: User },
          { id: "income", label: "Income Details", icon: DollarSign },
          { id: "deductions", label: "Deductions", icon: CheckCircle },
          { id: "exemptions", label: "Exemptions", icon: Info },
          { id: "paid", label: "Tax Paid Register", icon: BookOpen },
          { id: "statement", label: "Tax Statement", icon: FileText },
          { id: "settings", label: "Tax Settings Rules", icon: Settings },
          { id: "history", label: "History Logs", icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-t-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? "border-blue-600 text-blue-700 bg-white shadow-sm font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== SUB-VIEW 1: OVERVIEW DASHBOARD ==================== */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6 print:hidden animate-fade-in">
          {/* Top KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Total Income</span>
              <span className="text-xl font-mono font-bold text-slate-800 mt-2">{formatCurrency(currentSummary.grossTotalIncome)}</span>
              <div className="text-[10px] text-slate-400 mt-1">Exempt portion excluded</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxable Income</span>
              <span className="text-xl font-mono font-bold text-blue-700 mt-2">{formatCurrency(currentSummary.taxableIncome)}</span>
              <div className="text-[10px] text-slate-400 mt-1">After allowable deductions</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Gross Tax</span>
              <span className="text-xl font-mono font-bold text-slate-800 mt-2">{formatCurrency(currentSummary.grossTaxLiability)}</span>
              <div className="text-[10px] text-emerald-600 mt-1">Rebate: {formatCurrency(currentSummary.calculatedRebate)}</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between bg-blue-50/20 border-blue-100">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Net Tax Payable / Refund</span>
              <span className="text-xl font-mono font-bold text-blue-900 mt-2">
                {currentSummary.taxRefundable > 0 ? (
                  <span className="text-emerald-700">Refund: {formatCurrency(currentSummary.taxRefundable)}</span>
                ) : (
                  <span>Payable: {formatCurrency(currentSummary.netTaxPayable)}</span>
                )}
              </span>
              <div className="text-[10px] text-slate-500 mt-1">TDS adjusted: {formatCurrency(currentSummary.totalTaxPaid)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quick Engine Step Breakdown */}
            <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center">
                <Sparkles className="h-4 w-4 mr-1.5 text-blue-500 animate-pulse" />
                Step-by-Step Transparent Computation Breakdown
              </h4>

              <div className="space-y-3.5 font-mono text-xs text-slate-600">
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Gross Total Income (Salary + Other)</span>
                  <span className="font-bold text-slate-800">{formatCurrency(currentSummary.grossTotalIncome)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Less: Allowable Deductions (Approved Deductions)</span>
                  <span className="font-bold text-red-600">-{formatCurrency(currentSummary.totalAllowableDeductions)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span>(=) Taxable Income Base</span>
                  <span className="font-bold text-blue-700">{formatCurrency(currentSummary.taxableIncome)}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Slab-wise Income Tax Math (Configured Slabs)</span>
                  {currentSummary.slabWiseCalculations.map((sc, i) => (
                    <div key={i} className="flex justify-between text-[11px] text-slate-500">
                      <span>
                        Slab {sc.slabMin} - {sc.slabMax === null ? "Above" : sc.slabMax} ({sc.rate}%)
                      </span>
                      <span>
                        {formatCurrency(sc.taxableInThisSlab)} * {sc.rate}% = <span className="font-bold text-slate-700">{formatCurrency(sc.taxAmount)}</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1.5 mt-1">
                    <span>Total Slab Tax Liability</span>
                    <span>{formatCurrency(currentSummary.grossTaxLiability)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Less: Calculated Investment Tax Rebate</span>
                  <span className="font-bold text-emerald-600">-{formatCurrency(currentSummary.calculatedRebate)}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Add: Minimum Tax Adjustment</span>
                  <span className="font-bold text-slate-700">+{formatCurrency(currentSummary.minimumTaxApplied)}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Add: Wealth Surcharge</span>
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={wealthSurchargePercent}
                      onChange={(e) => setWealthSurchargePercent(parseNum(e.target.value))}
                      className="text-[10px] border border-slate-200 p-0.5 rounded font-mono"
                    >
                      <option value="0">0% Surcharge</option>
                      <option value="10">10% Surcharge</option>
                      <option value="20">20% Surcharge</option>
                      <option value="30">30% Surcharge</option>
                    </select>
                    <span className="font-bold text-slate-700">+{formatCurrency(currentSummary.surchargeAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Add: Additional Manual Adjustment</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      value={additionalTaxInput}
                      onChange={(e) => setAdditionalTaxInput(parseNum(e.target.value))}
                      className="text-[10px] w-20 border border-slate-200 p-0.5 rounded font-mono text-right"
                    />
                    <span className="font-bold text-slate-700">+{formatCurrency(additionalTaxInput)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span>(=) Net Tax Liability for the Year</span>
                  <span className="font-bold text-slate-800">{formatCurrency(currentSummary.netTaxLiability)}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span>Less: Total Tax Paid / TDS Register</span>
                  <span className="font-bold text-emerald-600">-{formatCurrency(currentSummary.totalTaxPaid)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 text-sm">
                  <span className="font-bold text-slate-800">Effective Net Estimated Tax Payable</span>
                  <span className="font-bold font-mono text-blue-800 text-base">{formatCurrency(currentSummary.netTaxPayable)}</span>
                </div>
              </div>
            </div>

            {/* Validation & Draft Action Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Review & Audit Validation</h4>

                {validationWarnings.length === 0 ? (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center space-x-2 text-xs text-emerald-800">
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Calculation profile is perfectly clean! No missing details or potential duplicate warnings found.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] text-amber-800 font-semibold flex items-center bg-amber-50 p-2 rounded">
                      <AlertTriangle className="h-4 w-4 mr-1 text-amber-600" />
                      {validationWarnings.length} Warnings/Observations Detected:
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                      {validationWarnings.map((warn, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 rounded text-[10px] text-slate-600 border border-slate-100">
                          {warn}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={handleFinalizeCalculation}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition flex items-center justify-center space-x-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Lock & Finalize Statement</span>
                  </button>
                </div>
              </div>

              {/* Version revision quick panel */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Version revisions</h4>
                <p className="text-[11px] text-slate-400">Save edits separately without losing your pristine baseline data.</p>
                <button
                  onClick={handleCreateRevisedVersion}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg transition flex items-center justify-center space-x-1"
                >
                  <History className="h-4 w-4" />
                  <span>Create Revised Version</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-VIEW 2: TAXPAYER PROFILE ==================== */}
      {activeSubTab === "profile" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h4 className="text-sm font-bold text-slate-800">Maintain Taxpayer Profile</h4>
            <p className="text-xs text-slate-400">Keep multiple personal profile contexts or family accounts separate without logins.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Taxpayer Name *</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                placeholder="e.g. Zahirul Islam"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Taxpayer Identification Number (TIN) *</label>
              <input
                type="text"
                value={profileTin}
                onChange={(e) => setProfileTin(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                placeholder="12-digit number"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Residency Status</label>
              <select
                value={profileResidency}
                onChange={(e) => setProfileResidency(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
              >
                <option value="Resident">Resident</option>
                <option value="Non-Resident">Non-Resident</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Taxpayer Slab Threshold Group</label>
              <select
                value={profileGender}
                onChange={(e) => setProfileGender(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
              >
                <option value="General">General / Male (350,000 threshold)</option>
                <option value="Female">Female (400,000 threshold)</option>
                <option value="Senior (65+)">Senior Citizen (65+) (400,000 threshold)</option>
                <option value="Person with Disability">Person with Disability (475,000 threshold)</option>
                <option value="Freedom Fighter">Freedom Fighter (500,000 threshold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
              <input
                type="date"
                value={profileDob}
                onChange={(e) => setProfileDob(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Employment Status</label>
              <input
                type="text"
                value={profileEmployment}
                onChange={(e) => setProfileEmployment(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                placeholder="Private Employee, Freelancer, Business Owner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Main Income Source</label>
              <input
                type="text"
                value={profileIncomeSource}
                onChange={(e) => setProfileIncomeSource(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                placeholder="Salary, Professional Fee, Business Profit"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Minimum Tax Jurisdiction</label>
              <select
                value={profileJurisdiction}
                onChange={(e) => setProfileJurisdiction(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
              >
                <option value="Dhaka/Chittagong City">Dhaka/Chittagong City Corporation (5,000 Minimum)</option>
                <option value="Other City Corporation">Other City Corporation (4,000 Minimum)</option>
                <option value="Outside City Corporation">Outside City Corporations (3,000 Minimum)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea
                value={profileNotes}
                onChange={(e) => setProfileNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 h-20"
                placeholder="Add special family, asset, or tax-authority filing context here..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              onClick={handleSaveProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* ==================== SUB-VIEW 3: INCOME DETAILS & SALARY ==================== */}
      {activeSubTab === "income" && (
        <div className="space-y-6 animate-fade-in">
          {/* Detailed Salary Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Salary Tax Details Schedule</h4>
                <p className="text-xs text-slate-400">Input itemized salary components to calculate auto tax-exempt allowance portions.</p>
              </div>
              <button
                onClick={() => {
                  setImportCategoryMapping("Salary");
                  setShowImportModal(true);
                }}
                className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Import Salary Tx</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Basic Salary (BDT)</label>
                <input
                  type="number"
                  value={salaryDetails.basicSalary}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, basicSalary: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">House Rent Allowance</label>
                <input
                  type="number"
                  value={salaryDetails.houseRentAllowance}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, houseRentAllowance: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Medical Allowance</label>
                <input
                  type="number"
                  value={salaryDetails.medicalAllowance}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, medicalAllowance: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Conveyance Allowance</label>
                <input
                  type="number"
                  value={salaryDetails.conveyanceAllowance}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, conveyanceAllowance: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bonus</label>
                <input
                  type="number"
                  value={salaryDetails.bonus}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, bonus: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Employer Contribution</label>
                <input
                  type="number"
                  value={salaryDetails.employerContribution}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, employerContribution: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Other Benefits / Perks</label>
                <input
                  type="number"
                  value={salaryDetails.otherBenefits}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, otherBenefits: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tax-Exempt Allowance Portion (Auto if 0)</label>
                <input
                  type="number"
                  value={salaryDetails.taxExemptAllowancePortion}
                  onChange={(e) => setSalaryDetails({ ...salaryDetails, taxExemptAllowancePortion: parseNum(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Dynamic other incomes Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Other Incomes Schedule</h4>
                <p className="text-xs text-slate-400">Import general incomes, record manually, or select and exclude personal transfers.</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setImportCategoryMapping("Other");
                    setShowImportModal(true);
                  }}
                  className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Import Income Tx</span>
                </button>
                <button
                  onClick={() => {
                    const newItem: TaxIncomeItem = {
                      id: `manual-inc-${Date.now()}`,
                      category: "Other",
                      description: "Manual Income Entry",
                      amount: 0,
                      isImported: false,
                      isExcluded: false
                    };
                    setIncomeItems([...incomeItems, newItem]);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Manual</span>
                </button>
              </div>
            </div>

            {incomeItems.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-semibold">No other income items registered</p>
                <p className="text-xs text-slate-400 mt-1">Import from transactions to preserve double-entry audit trails.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Amount (BDT)</th>
                      <th className="p-3">Reference / Notes</th>
                      <th className="p-3">Status / Exclude</th>
                      <th className="p-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {incomeItems.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-slate-50/50 ${item.isExcluded ? "bg-red-50/20 text-slate-400" : ""}`}>
                        <td className="p-3">
                          <select
                            value={item.category}
                            onChange={(e) => {
                              setIncomeItems(incomeItems.map(x => x.id === item.id ? { ...x, category: e.target.value as any } : x));
                            }}
                            className="border border-slate-200 rounded p-1 text-xs"
                          >
                            <option value="Salary">Salary</option>
                            <option value="Bonus & Allowances">Bonus & Allowances</option>
                            <option value="Freelance/Professional">Freelance/Professional</option>
                            <option value="Business">Business</option>
                            <option value="Rental">Rental</option>
                            <option value="Bank Interest">Bank Interest</option>
                            <option value="Investment">Investment</option>
                            <option value="Dividend">Dividend</option>
                            <option value="Capital Gain">Capital Gain</option>
                            <option value="Agricultural">Agricultural</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              setIncomeItems(incomeItems.map(x => x.id === item.id ? { ...x, description: e.target.value } : x));
                            }}
                            className="border border-slate-200 rounded p-1 text-xs w-full"
                          />
                        </td>

                        <td className="p-3 font-mono">
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              setIncomeItems(incomeItems.map(x => x.id === item.id ? { ...x, amount: parseNum(e.target.value) } : x));
                            }}
                            className="border border-slate-200 rounded p-1 text-xs w-28 font-mono text-right"
                          />
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={(e) => {
                              setIncomeItems(incomeItems.map(x => x.id === item.id ? { ...x, notes: e.target.value } : x));
                            }}
                            className="border border-slate-200 rounded p-1 text-xs w-full"
                            placeholder="Add reference, challan, supporting notes..."
                          />
                        </td>

                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={item.isExcluded}
                              onChange={(e) => {
                                setIncomeItems(incomeItems.map(x => x.id === item.id ? { ...x, isExcluded: e.target.checked } : x));
                              }}
                              id={`exc-${item.id}`}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor={`exc-${item.id}`} className="text-[10px] text-slate-500 font-semibold cursor-pointer">
                              Exclude (Transfer)
                            </label>
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setIncomeItems(incomeItems.filter(x => x.id !== item.id));
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition cursor-pointer"
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

      {/* ==================== SUB-VIEW 4: ALLOWABLE DEDUCTIONS ==================== */}
      {activeSubTab === "deductions" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Deductions & Investments Schedule</h4>
              <p className="text-xs text-slate-400">Log approved investments, medical bills, professional expenses, and check eligibility status.</p>
            </div>
            <button
              onClick={() => {
                const newItem: TaxDeduction = {
                  id: `ded-${Date.now()}`,
                  category: "Approved investment",
                  description: "Approved Investment Scheme",
                  amount: 0,
                  eligibilityStatus: "Eligible"
                };
                setDeductions([...deductions, newItem]);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Deduction</span>
            </button>
          </div>

          {deductions.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold">
              No deductions recorded. Please log investments to claim eligible tax rebates.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-sans">
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Amount (BDT)</th>
                    <th className="p-3">Eligibility Status</th>
                    <th className="p-3">Supporting Note / Ref</th>
                    <th className="p-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {deductions.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <select
                          value={d.category}
                          onChange={(e) => {
                            setDeductions(deductions.map(x => x.id === d.id ? { ...x, category: e.target.value as any } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs font-sans"
                        >
                          <option value="Approved investment">Approved investment</option>
                          <option value="Insurance premium">Insurance premium</option>
                          <option value="Retirement or pension contribution">Retirement/Pension</option>
                          <option value="Donations">Donations</option>
                          <option value="Medical deduction">Medical deduction</option>
                          <option value="Education-related deduction">Education deduction</option>
                          <option value="Business expense">Business expense</option>
                          <option value="Professional expense">Professional expense</option>
                          <option value="Other allowable deduction">Other deduction</option>
                        </select>
                      </td>

                      <td className="p-3 font-sans">
                        <input
                          type="text"
                          value={d.description}
                          onChange={(e) => {
                            setDeductions(deductions.map(x => x.id === d.id ? { ...x, description: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-full"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          value={d.amount}
                          onChange={(e) => {
                            setDeductions(deductions.map(x => x.id === d.id ? { ...x, amount: parseNum(e.target.value) } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-28 text-right font-mono"
                        />
                      </td>

                      <td className="p-3">
                        <select
                          value={d.eligibilityStatus}
                          onChange={(e) => {
                            setDeductions(deductions.map(x => x.id === d.id ? { ...x, eligibilityStatus: e.target.value as any } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs font-sans font-semibold text-slate-700"
                        >
                          <option value="Eligible">Eligible</option>
                          <option value="Pending Review">Pending Review</option>
                          <option value="Not Eligible">Not Eligible</option>
                        </select>
                      </td>

                      <td className="p-3 font-sans">
                        <input
                          type="text"
                          value={d.supportingNote || ""}
                          onChange={(e) => {
                            setDeductions(deductions.map(x => x.id === d.id ? { ...x, supportingNote: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-full"
                          placeholder="Supporting receipt/Reference details..."
                        />
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setDeductions(deductions.filter(x => x.id !== d.id));
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition cursor-pointer"
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
      )}

      {/* ==================== SUB-VIEW 5: EXEMPT INCOME ==================== */}
      {activeSubTab === "exemptions" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Exempt Incomes Schedule</h4>
              <p className="text-xs text-slate-400">Log tax-exempt categories, allowances, or policy benefits along with legal references.</p>
            </div>
            <button
              onClick={() => {
                const newItem: TaxExemptIncome = {
                  id: `ex-${Date.now()}`,
                  category: "Agricultural Income",
                  grossAmount: 0,
                  exemptAmount: 0,
                  taxablePortion: 0,
                  legalReference: "Income Tax Act Rule"
                };
                setExemptIncomes([...exemptIncomes, newItem]);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Exemption</span>
            </button>
          </div>

          {exemptIncomes.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold">
              No tax-exempt items added. Add exemptions to deduct gross income calculations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-sans">
                    <th className="p-3">Category</th>
                    <th className="p-3">Gross Amount (BDT)</th>
                    <th className="p-3">Exempt Amount</th>
                    <th className="p-3">Taxable Portion</th>
                    <th className="p-3">Legal/Policy Reference</th>
                    <th className="p-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {exemptIncomes.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-sans">
                        <input
                          type="text"
                          value={ex.category}
                          onChange={(e) => {
                            setExemptIncomes(exemptIncomes.map(x => x.id === ex.id ? { ...x, category: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-full"
                          placeholder="Category or Exemption basis"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          value={ex.grossAmount}
                          onChange={(e) => {
                            const gross = parseNum(e.target.value);
                            setExemptIncomes(exemptIncomes.map(x => x.id === ex.id ? { ...x, grossAmount: gross, taxablePortion: Math.max(0, gross - x.exemptAmount) } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-28 text-right font-mono"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          value={ex.exemptAmount}
                          onChange={(e) => {
                            const exempt = parseNum(e.target.value);
                            setExemptIncomes(exemptIncomes.map(x => x.id === ex.id ? { ...x, exemptAmount: exempt, taxablePortion: Math.max(0, x.grossAmount - exempt) } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-28 text-right font-mono text-emerald-700 font-bold"
                        />
                      </td>

                      <td className="p-3 text-right font-bold pr-6">
                        {formatCurrency(ex.taxablePortion)}
                      </td>

                      <td className="p-3 font-sans">
                        <input
                          type="text"
                          value={ex.legalReference}
                          onChange={(e) => {
                            setExemptIncomes(exemptIncomes.map(x => x.id === ex.id ? { ...x, legalReference: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-full"
                          placeholder="e.g. Section 44(2) of ITA"
                        />
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setExemptIncomes(exemptIncomes.filter(x => x.id !== ex.id));
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition cursor-pointer"
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
      )}

      {/* ==================== SUB-VIEW 6: TAX PAID REGISTER ==================== */}
      {activeSubTab === "paid" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Tax Paid & TDS Register</h4>
              <p className="text-xs text-slate-400">Track and adjust withholding taxes (TDS), advance taxes, or manual challan tax deposits.</p>
            </div>
            <button
              onClick={() => {
                const newItem: TaxPaidItem = {
                  id: `paid-${Date.now()}`,
                  type: "TDS (Tax Deducted at Source)",
                  amount: 0,
                  paymentDate: new Date().toISOString().split("T")[0],
                  referenceChallanNumber: "",
                  paymentMethod: "Bank Transfer",
                  taxYear: selectedTaxYear
                };
                setTaxPaidItems([...taxPaidItems, newItem]);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Tax Paid</span>
            </button>
          </div>

          {taxPaidItems.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold">
              No historical tax payments logged. Add payments to claim tax liability credits.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-sans">
                    <th className="p-3">Payment Type</th>
                    <th className="p-3">Amount (BDT)</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Challan / Ref Number</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {taxPaidItems.map((tp) => (
                    <tr key={tp.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <select
                          value={tp.type}
                          onChange={(e) => {
                            setTaxPaidItems(taxPaidItems.map(x => x.id === tp.id ? { ...x, type: e.target.value as any } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs font-sans font-semibold text-slate-700"
                        >
                          <option value="TDS (Tax Deducted at Source)">TDS (withholding)</option>
                          <option value="Advance Tax">Advance Tax</option>
                          <option value="Employer Tax Deduction">Employer salary TDS</option>
                          <option value="Bank Interest TDS">Bank Interest TDS</option>
                          <option value="Investment-related TDS">Investment TDS</option>
                          <option value="Manual Tax Payment">Manual Challan Payment</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          value={tp.amount}
                          onChange={(e) => {
                            setTaxPaidItems(taxPaidItems.map(x => x.id === tp.id ? { ...x, amount: parseNum(e.target.value) } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-28 text-right font-mono"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="date"
                          value={tp.paymentDate}
                          onChange={(e) => {
                            setTaxPaidItems(taxPaidItems.map(x => x.id === tp.id ? { ...x, paymentDate: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs"
                        />
                      </td>

                      <td className="p-3 font-sans">
                        <input
                          type="text"
                          value={tp.referenceChallanNumber}
                          onChange={(e) => {
                            setTaxPaidItems(taxPaidItems.map(x => x.id === tp.id ? { ...x, referenceChallanNumber: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-full"
                          placeholder="Challan/Chq transaction ID..."
                        />
                      </td>

                      <td className="p-3 font-sans">
                        <input
                          type="text"
                          value={tp.paymentMethod}
                          onChange={(e) => {
                            setTaxPaidItems(taxPaidItems.map(x => x.id === tp.id ? { ...x, paymentMethod: e.target.value } : x));
                          }}
                          className="border border-slate-200 rounded p-1 text-xs w-full"
                          placeholder="Cash, Bank, Mobile Transfer"
                        />
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setTaxPaidItems(taxPaidItems.filter(x => x.id !== tp.id));
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition cursor-pointer"
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
      )}

      {/* ==================== SUB-VIEW 7: COMP_STATEMENT (A4 PRINTABLE) ==================== */}
      {activeSubTab === "statement" && (
        <div className="space-y-6">
          {/* Printable controller */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center print:hidden">
            <span className="text-xs text-slate-500">Format ready for printing on standard A4 paper size.</span>
            <div className="flex space-x-2">
              <button
                onClick={exportExcelCSV}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Print Statement
              </button>
            </div>
          </div>

          {/* Printable Layout Wrapper */}
          <div className="bg-white p-8 md:p-12 rounded-xl border border-slate-300 shadow-lg max-w-4xl mx-auto space-y-6 font-sans text-slate-800 print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="text-center pb-6 border-b-2 border-slate-800 space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-tight">Statement of Personal Income Tax Computation</h2>
              <span className="text-[10px] font-mono block text-slate-500 uppercase tracking-widest bg-slate-100 py-1 rounded">
                Estimated Tax Calculation Statement • Confidential Audit Baseline
              </span>
              <p className="text-xs text-slate-400 italic">Not a replacement for filings designed by a licensed tax professional.</p>
            </div>

            {/* Profiles detail block */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-100">
                <p><span className="font-bold text-slate-500 uppercase text-[9px] block">Taxpayer Name</span> {profileName || "N/A"}</p>
                <p><span className="font-bold text-slate-500 uppercase text-[9px] block">National TIN</span> {profileTin || "N/A"}</p>
                <p><span className="font-bold text-slate-500 uppercase text-[9px] block">Jurisdiction</span> {profileJurisdiction || "N/A"}</p>
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-100">
                <p><span className="font-bold text-slate-500 uppercase text-[9px] block">Income Year</span> {selectedTaxYear}</p>
                <p><span className="font-bold text-slate-500 uppercase text-[9px] block">Assessment Year</span> {selectedTaxYear.split("-").map(y => parseNum(y) + 1).join("-")}</p>
                <p><span className="font-bold text-slate-500 uppercase text-[9px] block">Residency Status</span> {profileResidency}</p>
              </div>
            </div>

            {/* Income breakdown schedules */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase border-b border-slate-800 pb-1 text-slate-700">Schedule A: Gross Taxable Income</h3>
              <div className="space-y-1 text-xs">
                {salaryDetails.basicSalary > 0 && (
                  <div className="flex justify-between font-mono py-1 border-b border-slate-100">
                    <span className="font-sans">Itemized Salary Income (Basic + Allowances net of exemptions)</span>
                    <span>{formatCurrency(currentSummary.grossTotalIncome - incomeItems.filter(i => !i.isExcluded && i.category !== "Salary").reduce((s, i) => s + i.amount, 0))}</span>
                  </div>
                )}
                {incomeItems.filter(item => !item.isExcluded).map((item) => (
                  <div key={item.id} className="flex justify-between font-mono py-1 border-b border-slate-100">
                    <span className="font-sans">{item.category} - {item.description}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-300 pt-1">
                  <span>Gross Aggregate Income</span>
                  <span className="font-mono">{formatCurrency(currentSummary.grossTotalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Deductions breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase border-b border-slate-800 pb-1 text-slate-700">Schedule B: Allowable Deductions</h3>
              {deductions.filter(d => d.eligibilityStatus === "Eligible").length === 0 ? (
                <p className="text-[11px] italic text-slate-400">No deductions registered for rebate or deduction credits.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {deductions.filter(d => d.eligibilityStatus === "Eligible").map((d) => (
                    <div key={d.id} className="flex justify-between font-mono py-1 border-b border-slate-100">
                      <span className="font-sans">{d.category} - {d.description}</span>
                      <span>{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-300 pt-1">
                    <span>Total Allowable Deductions</span>
                    <span className="font-mono">{formatCurrency(currentSummary.totalAllowableDeductions)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Taxable base & computation */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase border-b border-slate-800 pb-1 text-slate-700">Schedule C: Tax Liability Calculation</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-mono font-bold pb-2">
                  <span className="font-sans text-slate-700">(=) Taxable Income Base</span>
                  <span className="text-blue-700">{formatCurrency(currentSummary.taxableIncome)}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Slab calculation schedules</span>
                  {currentSummary.slabWiseCalculations.map((sc, i) => (
                    <div key={i} className="flex justify-between font-mono text-[11px]">
                      <span>Slab {sc.slabMin} - {sc.slabMax === null ? "Above" : sc.slabMax} ({sc.rate}%)</span>
                      <span>{formatCurrency(sc.taxableInThisSlab)} * {sc.rate}% = {formatCurrency(sc.taxAmount)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-mono pt-1">
                  <span className="font-sans">Gross Tax Liability</span>
                  <span>{formatCurrency(currentSummary.grossTaxLiability)}</span>
                </div>
                <div className="flex justify-between font-mono text-emerald-700 font-semibold">
                  <span className="font-sans">Less: Investment Rebate</span>
                  <span>-{formatCurrency(currentSummary.calculatedRebate)}</span>
                </div>
                {currentSummary.minimumTaxApplied > 0 && (
                  <div className="flex justify-between font-mono">
                    <span className="font-sans">Add: Minimum Tax Adjustment</span>
                    <span>+{formatCurrency(currentSummary.minimumTaxApplied)}</span>
                  </div>
                )}
                {currentSummary.surchargeAmount > 0 && (
                  <div className="flex justify-between font-mono">
                    <span className="font-sans">Add: Wealth Surcharge</span>
                    <span>+{formatCurrency(currentSummary.surchargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-300 pt-1.5">
                  <span>Net Estimated Annual Tax Liability</span>
                  <span className="font-mono">{formatCurrency(currentSummary.netTaxLiability)}</span>
                </div>
                <div className="flex justify-between font-mono text-slate-500 pb-2 border-b border-slate-200">
                  <span className="font-sans">Less: Tax already Paid / TDS Credit</span>
                  <span>-{formatCurrency(currentSummary.totalTaxPaid)}</span>
                </div>

                <div className="flex justify-between font-bold text-slate-800 text-sm pt-2">
                  <span>NET TAX PAYABLE / (REFUNDABLE)</span>
                  <span className="font-mono text-blue-800">
                    {currentSummary.taxRefundable > 0 ? (
                      <span className="text-emerald-700">({formatCurrency(currentSummary.taxRefundable)}) Refund</span>
                    ) : (
                      <span>{formatCurrency(currentSummary.netTaxPayable)} Payable</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Assumptions & Signatures */}
            <div className="grid grid-cols-2 gap-6 pt-8 text-xs">
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Assumptions & Remarks</span>
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-100">
                  {assumptions || "No specific tax exemptions or complex cross-border tax considerations were registered. Simple personal single-jurisdiction baseline assumed."}
                </p>
              </div>

              <div className="flex flex-col justify-end space-y-4">
                <div className="border-t border-slate-400 pt-1 flex justify-between text-[11px]">
                  <span>Prepared By:</span>
                  <span className="font-bold">{preparedBy || "Self"}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Preparation Date:</span>
                  <span className="font-mono">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-VIEW 8: TAX SETTINGS RULES ==================== */}
      {activeSubTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Rules configurations builder */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center">
              <Settings className="h-4.5 w-4.5 mr-1.5 text-blue-500" />
              Configure Tax Year Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Tax Year</label>
                <input
                  type="text"
                  value={configTaxYear}
                  onChange={(e) => setConfigTaxYear(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  placeholder="e.g. 2025-2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Base Tax-Free Threshold</label>
                <input
                  type="number"
                  value={configFreeThreshold}
                  onChange={(e) => setConfigFreeThreshold(parseNum(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rounding Rule</label>
                <select
                  value={configRounding}
                  onChange={(e) => setConfigRounding(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                >
                  <option value="Nearest 1">Nearest 1</option>
                  <option value="Nearest 10">Nearest 10</option>
                  <option value="Nearest 100">Nearest 100</option>
                  <option value="Normal">Normal Rounding</option>
                </select>
              </div>
            </div>

            {/* Special category thresholds */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Category Threshold Adjustments</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Female</label>
                  <input
                    type="number"
                    value={configFemaleThreshold}
                    onChange={(e) => setConfigFemaleThreshold(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Senior (65+)</label>
                  <input
                    type="number"
                    value={configSeniorThreshold}
                    onChange={(e) => setConfigSeniorThreshold(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Disabled</label>
                  <input
                    type="number"
                    value={configDisabledThreshold}
                    onChange={(e) => setConfigDisabledThreshold(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Freedom Fighter</label>
                  <input
                    type="number"
                    value={configFFThreshold}
                    onChange={(e) => setConfigFFThreshold(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Minimum Taxes */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Minimum Jurisdictional Taxes</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Dhaka & Chittagong</label>
                  <input
                    type="number"
                    value={configMinTaxDhaka}
                    onChange={(e) => setConfigMinTaxDhaka(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Other City Corporations</label>
                  <input
                    type="number"
                    value={configMinTaxCity}
                    onChange={(e) => setConfigMinTaxCity(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Outside City Corporations</label>
                  <input
                    type="number"
                    value={configMinTaxOutside}
                    onChange={(e) => setConfigMinTaxOutside(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Rebate Rules */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Investment Rebate Rules</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Allowed Rebate Rate (%)</label>
                  <input
                    type="number"
                    value={configRebateRate}
                    onChange={(e) => setConfigRebateRate(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Max Rebate limit of taxable Income (%)</label>
                  <input
                    type="number"
                    value={configRebatePercentOfInc}
                    onChange={(e) => setConfigRebatePercentOfInc(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Max Flat Rebate Cap (BDT)</label>
                  <input
                    type="number"
                    value={configMaxRebate}
                    onChange={(e) => setConfigMaxRebate(parseNum(e.target.value))}
                    className="w-full text-xs p-2 bg-white rounded border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">Rules apply dynamically. Save rules context separately.</span>
              <button
                onClick={handleSaveTaxConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Save Tax Configuration
              </button>
            </div>
          </div>

          {/* Configuration List Checklists */}
          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Fiscal Rules checklist</h4>

            {taxConfigurations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No rules found. Seeding base configuration in background.</p>
            ) : (
              <div className="space-y-3">
                {taxConfigurations.map((cfg) => (
                  <div key={cfg.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono">{cfg.taxYear} Rules</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        cfg.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        {cfg.isActive ? "Active" : "Inactive Draft"}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-1 font-mono">
                      <p>Threshold: {formatCurrency(cfg.taxFreeThreshold)}</p>
                      <p>Min Tax (Dhaka): {formatCurrency(cfg.minimumTax.dhakaChittagong)}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <button
                        onClick={() => handleCopyConfigFromPrevious(cfg.id)}
                        className="text-[10px] text-blue-600 hover:underline font-bold flex items-center"
                      >
                        <Copy className="h-3.5 w-3.5 mr-0.5" />
                        <span>Copy Settings</span>
                      </button>

                      {!cfg.isActive && (
                        <button
                          onClick={() => {
                            if (confirm(`Do you wish to activate the config settings for Year ${cfg.taxYear}?`)) {
                              activateTaxConfiguration(cfg.id, cfg.taxYear);
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded transition"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUB-VIEW 9: HISTORY LOGS ==================== */}
      {activeSubTab === "history" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h4 className="text-sm font-bold text-slate-800">Calculation Version Logs</h4>
            <p className="text-xs text-slate-400">Restore prior draft estimates, compare revised versions, or view historic audit records.</p>
          </div>

          {taxCalculations.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No previous calculation records found. Start your first estimate in the Overview dashboard.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="p-3">Fiscal Year</th>
                    <th className="p-3">Version</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Taxable Income</th>
                    <th className="p-3">Net Tax Payable</th>
                    <th className="p-3">Updated Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {taxCalculations.map((calc) => (
                    <tr key={calc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800 font-sans">{calc.taxYear}</td>
                      <td className="p-3">v{calc.version || 1}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          calc.status === "Finalized" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {calc.status}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{formatCurrency(calc.summary?.taxableIncome || 0)}</td>
                      <td className="p-3 font-bold text-blue-700">{formatCurrency(calc.summary?.netTaxPayable || 0)}</td>
                      <td className="p-3 text-slate-500">{new Date(calc.createdDate).toLocaleDateString()}</td>
                      <td className="p-3 text-right flex justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setActiveCalculationId(calc.id);
                            setSelectedTaxYear(calc.taxYear);
                            setIncomeItems(calc.incomeItems || []);
                            setSalaryDetails(calc.salaryDetails || {
                              basicSalary: 0,
                              houseRentAllowance: 0,
                              medicalAllowance: 0,
                              conveyanceAllowance: 0,
                              bonus: 0,
                              employerContribution: 0,
                              employeeContribution: 0,
                              otherBenefits: 0,
                              taxExemptAllowancePortion: 0,
                              mappedTransactionIds: []
                            });
                            setDeductions(calc.deductions || []);
                            setExemptIncomes(calc.exemptIncomes || []);
                            setTaxPaidItems(calc.taxPaidItems || []);
                            setCalculationNotes(calc.notes || "");
                            setAssumptions(calc.assumptions || "");
                            setPreparedBy(calc.preparedBy || "Self");
                            setAuditTrail(calc.auditTrail || []);
                            setActiveSubTab("dashboard");
                            alert(`Tax calculation version v${calc.version || 1} loaded into workspace.`);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-bold font-sans cursor-pointer"
                        >
                          Restore Workspace
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to permanently delete this calculation version history log?")) {
                              await deleteTaxCalculation(calc.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
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
      )}

      {/* ==================== LEDGER TRANSACTION IMPORT MODAL ==================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Import Eligible Incomes from General Ledger</h4>
                <p className="text-[11px] text-slate-400">Only cleared double-entry transactions are shown to ensure audit compliance.</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none"
                  placeholder="Filter transactions by payee, description, category..."
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {getEligibleImportTransactions().length === 0 ? (
                <p className="text-xs text-center text-slate-400 font-semibold py-8">No unmapped income ledger transactions found matching date or description query.</p>
              ) : (
                getEligibleImportTransactions().map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => {
                      if (selectedImportTxIds.includes(tx.id)) {
                        setSelectedImportTxIds(selectedImportTxIds.filter(id => id !== tx.id));
                      } else {
                        setSelectedImportTxIds([...selectedImportTxIds, tx.id]);
                      }
                    }}
                    className={`p-3.5 rounded-lg border transition cursor-pointer flex justify-between items-center ${
                      selectedImportTxIds.includes(tx.id)
                        ? "border-blue-400 bg-blue-50/20"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-semibold">{tx.category}</span>
                        <span className="text-xs font-semibold text-slate-700">{tx.description}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Date: {tx.date} • Ref: {tx.referenceNumber || "N/A"}</div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono font-bold text-slate-800">{formatCurrency(tx.amount)}</span>
                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        selectedImportTxIds.includes(tx.id)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}>
                        {selectedImportTxIds.includes(tx.id) && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-mono">{selectedImportTxIds.length} items chosen</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportTransactions}
                  disabled={selectedImportTxIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  Import Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
