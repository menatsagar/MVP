import type {
  Employee,
  SalaryBand,
  ExchangeRate,
  ReviewCycle,
  AuditEntry,
  SalaryHistoryEntry,
} from "./types";

export const seedRates: ExchangeRate[] = [
  { code: "USD", name: "US Dollar", rateToUsd: 1, lastUpdated: "2026-01-05T10:00:00Z" },
  { code: "INR", name: "Indian Rupee", rateToUsd: 83.2, lastUpdated: "2026-01-05T10:00:00Z" },
  { code: "EUR", name: "Euro", rateToUsd: 0.92, lastUpdated: "2026-01-05T10:00:00Z" },
  { code: "AED", name: "UAE Dirham", rateToUsd: 3.67, lastUpdated: "2026-01-05T10:00:00Z" },
  { code: "GBP", name: "British Pound", rateToUsd: 0.79, lastUpdated: "2026-01-05T10:00:00Z" },
];

export const seedBands: SalaryBand[] = [
  { id: "b1", jobTitle: "Software Engineer", country: "India", currency: "INR", min: 900000, mid: 1400000, max: 2000000 },
  { id: "b2", jobTitle: "Senior Software Engineer", country: "India", currency: "INR", min: 1800000, mid: 2500000, max: 3500000 },
  { id: "b3", jobTitle: "Software Engineer", country: "USA", currency: "USD", min: 90000, mid: 120000, max: 160000 },
  { id: "b4", jobTitle: "Senior Software Engineer", country: "USA", currency: "USD", min: 140000, mid: 180000, max: 230000 },
  { id: "b5", jobTitle: "Software Engineer", country: "Germany", currency: "EUR", min: 60000, mid: 80000, max: 110000 },
  { id: "b6", jobTitle: "Sales Executive", country: "UK", currency: "GBP", min: 45000, mid: 60000, max: 85000 },
  { id: "b7", jobTitle: "Sales Manager", country: "UAE", currency: "AED", min: 250000, mid: 350000, max: 480000 },
  { id: "b8", jobTitle: "HR Specialist", country: "India", currency: "INR", min: 700000, mid: 1000000, max: 1400000 },
  { id: "b9", jobTitle: "Finance Analyst", country: "USA", currency: "USD", min: 75000, mid: 95000, max: 125000 },
  { id: "b10", jobTitle: "Operations Lead", country: "Germany", currency: "EUR", min: 70000, mid: 90000, max: 120000 },
  { id: "b11", jobTitle: "Engineering Manager", country: "USA", currency: "USD", min: 170000, mid: 210000, max: 270000 },
];

interface SeedEmp {
  name: string; dept: string; title: string; country: string; currency: string;
  salary: number; bonus: number; type: Employee["employmentType"];
}

const seedList: SeedEmp[] = [
  // India
  { name: "Priya Sharma", dept: "Engineering", title: "Software Engineer", country: "India", currency: "INR", salary: 1200000, bonus: 10, type: "Full-time" },
  { name: "Arjun Reddy", dept: "Engineering", title: "Senior Software Engineer", country: "India", currency: "INR", salary: 2400000, bonus: 15, type: "Full-time" },
  { name: "Neha Kapoor", dept: "Engineering", title: "Software Engineer", country: "India", currency: "INR", salary: 750000, bonus: 8, type: "Full-time" }, // below band
  { name: "Rohan Mehta", dept: "Engineering", title: "Senior Software Engineer", country: "India", currency: "INR", salary: 3800000, bonus: 20, type: "Full-time" }, // above band
  { name: "Anjali Iyer", dept: "HR", title: "HR Specialist", country: "India", currency: "INR", salary: 950000, bonus: 8, type: "Full-time" },
  { name: "Karthik Nair", dept: "Sales", title: "Sales Executive", country: "India", currency: "INR", salary: 1100000, bonus: 18, type: "Full-time" },
  { name: "Divya Rao", dept: "Finance", title: "Finance Analyst", country: "India", currency: "INR", salary: 1300000, bonus: 10, type: "Full-time" },
  // USA
  { name: "Michael Johnson", dept: "Engineering", title: "Software Engineer", country: "USA", currency: "USD", salary: 115000, bonus: 12, type: "Full-time" },
  { name: "Jessica Lee", dept: "Engineering", title: "Senior Software Engineer", country: "USA", currency: "USD", salary: 195000, bonus: 18, type: "Full-time" },
  { name: "David Chen", dept: "Engineering", title: "Engineering Manager", country: "USA", currency: "USD", salary: 220000, bonus: 25, type: "Full-time" },
  { name: "Emily Davis", dept: "Finance", title: "Finance Analyst", country: "USA", currency: "USD", salary: 65000, bonus: 8, type: "Full-time" }, // below band
  { name: "Robert Wilson", dept: "Sales", title: "Sales Manager", country: "USA", currency: "USD", salary: 145000, bonus: 25, type: "Full-time" },
  { name: "Sarah Martinez", dept: "HR", title: "HR Specialist", country: "USA", currency: "USD", salary: 78000, bonus: 8, type: "Part-time" },
  { name: "Daniel Brown", dept: "Operations", title: "Operations Lead", country: "USA", currency: "USD", salary: 95000, bonus: 10, type: "Contractor" },
  // Germany
  { name: "Lukas Müller", dept: "Engineering", title: "Software Engineer", country: "Germany", currency: "EUR", salary: 75000, bonus: 10, type: "Full-time" },
  { name: "Anna Schmidt", dept: "Operations", title: "Operations Lead", country: "Germany", currency: "EUR", salary: 88000, bonus: 12, type: "Full-time" },
  { name: "Felix Weber", dept: "Engineering", title: "Software Engineer", country: "Germany", currency: "EUR", salary: 130000, bonus: 15, type: "Full-time" }, // above band
  { name: "Klara Becker", dept: "Finance", title: "Finance Analyst", country: "Germany", currency: "EUR", salary: 70000, bonus: 10, type: "Full-time" },
  // UAE
  { name: "Omar Al-Farsi", dept: "Sales", title: "Sales Manager", country: "UAE", currency: "AED", salary: 320000, bonus: 25, type: "Full-time" },
  { name: "Layla Hassan", dept: "Sales", title: "Sales Executive", country: "UAE", currency: "AED", salary: 180000, bonus: 20, type: "Full-time" },
  { name: "Yusuf Khan", dept: "Operations", title: "Operations Lead", country: "UAE", currency: "AED", salary: 240000, bonus: 12, type: "Full-time" },
  // UK
  { name: "James Thompson", dept: "Sales", title: "Sales Executive", country: "UK", currency: "GBP", salary: 58000, bonus: 18, type: "Full-time" },
  { name: "Olivia Walker", dept: "Sales", title: "Sales Executive", country: "UK", currency: "GBP", salary: 38000, bonus: 15, type: "Part-time" }, // below band
  { name: "Henry Clarke", dept: "HR", title: "HR Specialist", country: "UK", currency: "GBP", salary: 52000, bonus: 8, type: "Full-time" },
  { name: "Sophie Bennett", dept: "Finance", title: "Finance Analyst", country: "UK", currency: "GBP", salary: 62000, bonus: 10, type: "Contractor" },
];

export const seedEmployees: Employee[] = seedList.map((e, i) => ({
  id: `EMP-${String(1001 + i)}`,
  name: e.name,
  department: e.dept,
  jobTitle: e.title,
  country: e.country,
  currency: e.currency,
  baseSalary: e.salary,
  bonusPct: e.bonus,
  effectiveDate: "2025-01-01",
  employmentType: e.type,
  status: "Active",
}));

export const seedHistory: SalaryHistoryEntry[] = seedEmployees.flatMap((emp) => {
  // initial + one prior entry for some
  const initial: SalaryHistoryEntry = {
    id: `H-${emp.id}-0`,
    employeeId: emp.id,
    effectiveDate: emp.effectiveDate,
    baseSalary: emp.baseSalary,
    currency: emp.currency,
    changeAmount: 0,
    changePct: 0,
    hrNote: "Initial record",
  };
  const prior: SalaryHistoryEntry = {
    id: `H-${emp.id}-p`,
    employeeId: emp.id,
    effectiveDate: "2024-01-01",
    baseSalary: Math.round(emp.baseSalary * 0.92),
    currency: emp.currency,
    changeAmount: 0,
    changePct: 0,
    hrNote: "Hired",
  };
  return [initial, prior];
});

export const seedCycles: ReviewCycle[] = [
  {
    id: "RC-2025",
    name: "Annual 2025",
    year: 2025,
    status: "Completed",
    totalBudgetUsd: 250000,
    budgets: [
      { department: "Engineering", budgetPct: 45 },
      { department: "Sales", budgetPct: 20 },
      { department: "Operations", budgetPct: 10 },
      { department: "Finance", budgetPct: 15 },
      { department: "HR", budgetPct: 10 },
    ],
    proposals: seedEmployees.map((e) => ({ employeeId: e.id, proposedIncreasePct: 5 })),
  },
  {
    id: "RC-MID-2026",
    name: "Mid-Year 2026",
    year: 2026,
    status: "In Progress",
    totalBudgetUsd: 150000,
    budgets: [
      { department: "Engineering", budgetPct: 50 },
      { department: "Sales", budgetPct: 20 },
      { department: "Operations", budgetPct: 10 },
      { department: "Finance", budgetPct: 10 },
      { department: "HR", budgetPct: 10 },
    ],
    proposals: seedEmployees.map((e, i) => ({
      employeeId: e.id,
      proposedIncreasePct: [3, 4, 5, 6, 7][i % 5],
    })),
  },
];

export const seedAudit: AuditEntry[] = [
  { id: "a1", timestamp: "2025-01-15T09:30:00Z", action: "Create", entityType: "Employee", entityName: "Priya Sharma (EMP-1001)", user: "HR Manager" },
  { id: "a2", timestamp: "2025-03-22T14:10:00Z", action: "Edit", entityType: "Employee", entityName: "Michael Johnson (EMP-1008)", field: "baseSalary", oldValue: "105000", newValue: "115000", user: "HR Manager" },
  { id: "a3", timestamp: "2025-06-01T11:00:00Z", action: "Create", entityType: "Band", entityName: "Software Engineer / USA", user: "HR Manager" },
  { id: "a4", timestamp: "2025-12-20T16:45:00Z", action: "Create", entityType: "Review Cycle", entityName: "Annual 2025", user: "HR Manager" },
  { id: "a5", timestamp: "2026-01-10T10:00:00Z", action: "Edit", entityType: "Exchange Rate", entityName: "INR", field: "rateToUsd", oldValue: "82.5", newValue: "83.2", user: "HR Manager" },
  { id: "a6", timestamp: "2026-05-05T08:20:00Z", action: "Deactivate", entityType: "Employee", entityName: "Sarah Martinez (EMP-1013)", field: "status", oldValue: "Active", newValue: "Inactive", user: "HR Manager" },
];
