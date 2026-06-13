export type EmploymentType = "Full-time" | "Part-time" | "Contractor";
export type Status = "Active" | "Inactive";

export interface Employee {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  country: string;
  currency: string;
  baseSalary: number;
  bonusPct: number;
  effectiveDate: string; // ISO
  employmentType: EmploymentType;
  hrNote?: string;
  status: Status;
}

export interface SalaryHistoryEntry {
  id: string;
  employeeId: string;
  effectiveDate: string;
  baseSalary: number;
  currency: string;
  changeAmount: number;
  changePct: number;
  hrNote: string;
}

export interface SalaryBand {
  id: string;
  jobTitle: string;
  country: string;
  currency: string;
  min: number;
  mid: number;
  max: number;
}

export interface ExchangeRate {
  code: string;
  name: string;
  rateToUsd: number; // local per 1 USD
  lastUpdated: string;
}

export type CycleStatus = "Draft" | "In Progress" | "Completed";

export interface DepartmentBudget {
  department: string;
  budgetPct: number;
}

export interface ReviewProposal {
  employeeId: string;
  proposedIncreasePct: number;
}

export interface ReviewCycle {
  id: string;
  name: string;
  year: number;
  status: CycleStatus;
  budgets: DepartmentBudget[];
  proposals: ReviewProposal[];
  totalBudgetUsd: number;
}

export type AuditAction = "Create" | "Edit" | "Deactivate";
export type AuditEntity = "Employee" | "Band" | "Review Cycle" | "Exchange Rate";

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  user: string;
}

export const DEPARTMENTS = ["Engineering", "HR", "Sales", "Finance", "Operations"];
export const JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Engineering Manager",
  "HR Specialist",
  "Sales Executive",
  "Sales Manager",
  "Finance Analyst",
  "Operations Lead",
];
export const COUNTRIES: { code: string; name: string; currency: string; symbol: string }[] = [
  { code: "IN", name: "India", currency: "INR", symbol: "₹" },
  { code: "US", name: "USA", currency: "USD", symbol: "$" },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€" },
  { code: "AE", name: "UAE", currency: "AED", symbol: "د.إ" },
  { code: "GB", name: "UK", currency: "GBP", symbol: "£" },
];
