export interface DebtDetail {
  id: string;
  userId: string;
  accountId: string;
  interestRate: number;
  minimumPayment: number;
  creditLimit?: number;
  dueDate?: number;
}

export type AccountType =
  | "Cash"
  | "Bank account"
  | "bKash"
  | "Nagad"
  | "Rocket"
  | "Credit card"
  | "Loan account"
  | "Investment account"
  | "Custom account";

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  targetGoal?: number;
  createdAt: string;
}

export type TransactionType = "Income" | "Expense" | "Transfer";

export interface Transaction {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  account: string; // Account ID
  toAccount?: string; // Account ID for Transfers
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  isReceivable?: boolean;
  isPayable?: boolean;
  isCleared?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "Income" | "Expense";
  isDefault?: boolean;
}

export interface ExtractedTransaction {
  date: string;
  type: TransactionType;
  amount: number;
  account: string;
  category: string;
  description: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
}

export interface BankStatementRow {
  id: string;
  date: string;
  description: string;
  referenceNumber: string;
  debit: number;
  credit: number;
  runningBalance: number;
  originalValues?: {
    date: string;
    description: string;
    referenceNumber: string;
    debit: number;
    credit: number;
    runningBalance: number;
  };
  auditTrail?: string[];
  status: "Matched" | "Suggested Match" | "Unmatched" | "Partially Matched" | "Manually Matched" | "Ignored" | "Bank-Only" | "Duplicate";
  matchedLedgerIds: string[];
}

export type AdjustmentType =
  | "Outstanding Cheque"
  | "Deposit in Transit"
  | "Bank Charge"
  | "Bank Interest"
  | "Direct Debit"
  | "Standing Order"
  | "Returned Cheque"
  | "Recording Error"
  | "Other Adjustment";

export interface ReconciliationAdjustment {
  id: string;
  type: AdjustmentType;
  description: string;
  amount: number;
  referenceNumber?: string;
  date: string;
  isLedgerCreated?: boolean;
  createdLedgerId?: string;
}

export interface ReconciliationRecord {
  id: string;
  userId: string;
  accountId: string;
  accountName: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  status: "Draft" | "Completed";
  createdDate: string;
  completedDate?: string;
  statementFileName?: string;
  statementFileSize?: number;
  statementRows: BankStatementRow[];
  adjustments: ReconciliationAdjustment[];
  summary: {
    statementClosingBalance: number;
    depositsInTransit: number;
    outstandingCheques: number;
    adjustedBankBalance: number;
    ledgerClosingBalance: number;
    ledgerAdjustments: number;
    adjustedLedgerBalance: number;
    difference: number;
  };
  preparedBy: string;
  notes?: string;
}

// ==================== TAX CALCULATION TYPES ====================

export interface TaxProfile {
  id: string;
  userId: string;
  taxpayerName: string;
  tin: string;
  taxYear: string;
  assessmentYear: string;
  residencyStatus: "Resident" | "Non-Resident";
  genderCategory: "General" | "Female" | "Senior (65+)" | "Person with Disability" | "Freedom Fighter";
  dateOfBirth: string;
  employmentStatus: string;
  mainSourceOfIncome: string;
  taxJurisdiction: "Dhaka/Chittagong City" | "Other City Corporation" | "Outside City Corporation";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxSlab {
  min: number;
  max: number | null;
  rate: number; // e.g. 5 for 5%, 0 for tax-free
}

export interface TaxConfiguration {
  id: string;
  userId: string;
  taxYear: string; // e.g., "2025-2026"
  isActive: boolean;
  taxFreeThreshold: number; // Default 350000
  specialThresholds: {
    female: number;
    senior: number;
    disabled: number;
    freedomFighter: number;
  };
  minimumTax: {
    dhakaChittagong: number;
    otherCity: number;
    outsideCity: number;
  };
  investmentRebateRate: number; // e.g. 15 for 15%
  rebatePercentageOfIncome: number; // e.g. 3 for 3% limit of taxable income
  maxRebateLimit: number; // e.g. 150000
  surchargeRates: { minWealth: number; rate: number }[]; // Surcharge on tax amount
  roundingRule: "Nearest 1" | "Nearest 10" | "Nearest 100" | "Normal";
  createdAt: string;
  updatedAt: string;
  slabs: TaxSlab[];
}

export interface TaxIncomeItem {
  id: string;
  category:
    | "Salary"
    | "Bonus & Allowances"
    | "Freelance/Professional"
    | "Business"
    | "Rental"
    | "Bank Interest"
    | "Investment"
    | "Dividend"
    | "Capital Gain"
    | "Agricultural"
    | "Other";
  description: string;
  amount: number;
  isImported: boolean;
  sourceTransactionId?: string;
  notes?: string;
  referenceNumber?: string;
  isExcluded: boolean;
}

export interface SalaryTaxDetails {
  basicSalary: number;
  houseRentAllowance: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  bonus: number;
  employerContribution: number;
  employeeContribution: number;
  otherBenefits: number;
  taxExemptAllowancePortion: number;
  mappedTransactionIds: string[];
}

export interface TaxDeduction {
  id: string;
  category:
    | "Approved investment"
    | "Insurance premium"
    | "Retirement or pension contribution"
    | "Donations"
    | "Medical deduction"
    | "Education-related deduction"
    | "Business expense"
    | "Professional expense"
    | "Other allowable deduction";
  description: string;
  amount: number;
  eligibilityStatus: "Eligible" | "Pending Review" | "Not Eligible";
  supportingNote?: string;
  attachmentRef?: string;
}

export interface TaxExemptIncome {
  id: string;
  category: string;
  grossAmount: number;
  exemptAmount: number;
  taxablePortion: number;
  legalReference: string;
  notes?: string;
}

export interface TaxPaidItem {
  id: string;
  type:
    | "TDS (Tax Deducted at Source)"
    | "Advance Tax"
    | "Employer Tax Deduction"
    | "Bank Interest TDS"
    | "Investment-related TDS"
    | "Manual Tax Payment";
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  referenceChallanNumber: string;
  paymentMethod: string;
  taxYear: string;
  notes?: string;
}

export interface TaxSlabBreakdown {
  slabMin: number;
  slabMax: number | null;
  rate: number;
  taxableInThisSlab: number;
  taxAmount: number;
}

export interface TaxCalculationSummary {
  grossTotalIncome: number;
  totalExemptIncome: number;
  totalAllowableDeductions: number;
  taxableIncome: number;
  slabWiseCalculations: TaxSlabBreakdown[];
  grossTaxLiability: number;
  eligibleInvestmentForRebate: number;
  calculatedRebate: number;
  surchargeAmount: number;
  minimumTaxApplied: number;
  additionalTax: number;
  netTaxLiability: number;
  totalTaxPaid: number;
  netTaxPayable: number;
  taxRefundable: number;
  effectiveTaxRate: number;
}

export interface TaxCalculationRecord {
  id: string;
  userId: string;
  taxYear: string;
  assessmentYear: string;
  profileId: string;
  profile: TaxProfile;
  status: "Draft" | "Under Review" | "Finalized";
  version: number;
  createdDate: string;
  finalizedDate?: string;
  incomeItems: TaxIncomeItem[];
  salaryDetails: SalaryTaxDetails;
  deductions: TaxDeduction[];
  exemptIncomes: TaxExemptIncome[];
  taxPaidItems: TaxPaidItem[];
  taxConfigUsed: TaxConfiguration;
  summary: TaxCalculationSummary;
  notes?: string;
  preparedBy: string;
  preparationDate: string;
  assumptions?: string;
  auditTrail: { action: string; timestamp: string; notes?: string }[];
}


