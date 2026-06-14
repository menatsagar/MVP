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
  createdAt: string; // ISO datetime
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

export const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Product", "Human Resources"];
export const JOB_TITLES = [
  "Software Engineer",
  "QA Engineer",
  "Sales Executive",
  "Marketing Manager",
  "Product Manager",
  "HR Specialist",
];
export const COUNTRIES: { code: string; name: string; currency: string; symbol: string }[] = [
  { code: "IN", name: "India", currency: "INR", symbol: "₹" },
  { code: "US", name: "United States", currency: "USD", symbol: "$" },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", symbol: "د.إ" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£" },
];
