import type { Employee, ExchangeRate } from "./types";
import { toUsd } from "./format";

export function exportEmployeesCsv(employees: Employee[], rates: ExchangeRate[]) {
  const headers = ["id", "name", "department", "jobTitle", "country", "currency", "baseSalary", "usdEquivalent", "bonusPct", "employmentType", "status", "effectiveDate"];
  const rows = employees.map((e) => {
    const usd = toUsd(e.baseSalary, e.currency, rates);
    return [e.id, e.name, e.department, e.jobTitle, e.country, e.currency, e.baseSalary, usd?.toFixed(0) ?? "", e.bonusPct, e.employmentType, e.status, e.effectiveDate];
  });
  download("employees.csv", toCsv([headers, ...rows]));
}

export function downloadSampleCsv() {
  const headers = ["name", "department", "jobTitle", "country", "currency", "baseSalary", "bonusPct", "employmentType", "effectiveDate"];
  const example = ["Jane Doe", "Engineering", "Software Engineer", "United States", "USD", "120000", "10", "Full-time", "2026-01-01"];
  download("employees-template.csv", toCsv([headers, example]));
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") { /* skip */ }
      else cur += ch;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
