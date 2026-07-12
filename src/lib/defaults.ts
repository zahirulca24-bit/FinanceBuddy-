import { AccountType, Category } from "../types";

export const DEFAULT_ACCOUNTS: { name: string; type: AccountType; initialBalance: number }[] = [
  { name: "Main Cash", type: "Cash", initialBalance: 0 },
  { name: "My Bank Account", type: "Bank account", initialBalance: 0 },
  { name: "bKash Personal", type: "bKash", initialBalance: 0 },
  { name: "Nagad Wallet", type: "Nagad", initialBalance: 0 }
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Freelance income",
  "Interest income",
  "Other income"
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Utility bills",
  "Shopping",
  "Medical",
  "Education",
  "Family expense",
  "Office expense",
  "Loan payment",
  "Other expense"
];

export const ACCOUNT_TYPES: AccountType[] = [
  "Cash",
  "Bank account",
  "bKash",
  "Nagad",
  "Rocket",
  "Credit card",
  "Loan account",
  "Investment account",
  "Custom account"
];
