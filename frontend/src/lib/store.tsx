import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  Employee, SalaryBand, ExchangeRate, ReviewCycle, AuditEntry,
  SalaryHistoryEntry, AuditAction, AuditEntity,
} from "./types";
import {
  seedEmployees, seedBands, seedRates, seedCycles, seedAudit, seedHistory,
} from "./seed";

interface StoreCtx {
  employees: Employee[];
  history: SalaryHistoryEntry[];
  bands: SalaryBand[];
  rates: ExchangeRate[];
  cycles: ReviewCycle[];
  audit: AuditEntry[];
  addEmployee: (e: Omit<Employee, "id"> & { id?: string }) => void;
  updateEmployee: (id: string, patch: Partial<Employee>, note: string) => void;
  setEmployeeStatus: (id: string, status: Employee["status"]) => void;
  addBand: (b: Omit<SalaryBand, "id">) => void;
  updateBand: (id: string, patch: Partial<SalaryBand>) => void;
  deleteBand: (id: string) => void;
  upsertRate: (r: ExchangeRate) => void;
  addRate: (r: ExchangeRate) => void;
  addCycle: (c: Omit<ReviewCycle, "id" | "status" | "proposals">) => void;
  updateCycle: (id: string, patch: Partial<ReviewCycle>) => void;
  commitCycle: (id: string) => void;
  logAudit: (e: Omit<AuditEntry, "id" | "timestamp" | "user">) => void;
  getBandFor: (jobTitle: string, country: string) => SalaryBand | undefined;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees);
  const [history, setHistory] = useState<SalaryHistoryEntry[]>(seedHistory);
  const [bands, setBands] = useState<SalaryBand[]>(seedBands);
  const [rates, setRates] = useState<ExchangeRate[]>(seedRates);
  const [cycles, setCycles] = useState<ReviewCycle[]>(seedCycles);
  const [audit, setAudit] = useState<AuditEntry[]>(seedAudit);

  const logAudit = useCallback((e: Omit<AuditEntry, "id" | "timestamp" | "user">) => {
    setAudit((prev) => [
      {
        ...e,
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        user: "HR Manager",
      },
      ...prev,
    ]);
  }, []);

  const addEmployee: StoreCtx["addEmployee"] = useCallback((e) => {
    const id = e.id || `EMP-${1000 + Math.floor(Math.random() * 9000)}`;
    const newEmp: Employee = { ...e, id } as Employee;
    setEmployees((prev) => [...prev, newEmp]);
    setHistory((prev) => [
      { id: `H-${id}-${Date.now()}`, employeeId: id, effectiveDate: newEmp.effectiveDate, baseSalary: newEmp.baseSalary, currency: newEmp.currency, changeAmount: 0, changePct: 0, hrNote: e.hrNote || "Initial record" },
      ...prev,
    ]);
    logAudit({ action: "Create", entityType: "Employee", entityName: `${newEmp.name} (${id})` });
  }, [logAudit]);

  const updateEmployee: StoreCtx["updateEmployee"] = useCallback((id, patch, note) => {
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      const updated = { ...e, ...patch };
      if (patch.baseSalary !== undefined && patch.baseSalary !== e.baseSalary) {
        const change = patch.baseSalary - e.baseSalary;
        const pct = (change / e.baseSalary) * 100;
        setHistory((h) => [
          { id: `H-${id}-${Date.now()}`, employeeId: id, effectiveDate: patch.effectiveDate || new Date().toISOString().slice(0, 10), baseSalary: patch.baseSalary!, currency: updated.currency, changeAmount: change, changePct: pct, hrNote: note },
          ...h,
        ]);
        logAudit({ action: "Edit", entityType: "Employee", entityName: `${updated.name} (${id})`, field: "baseSalary", oldValue: String(e.baseSalary), newValue: String(patch.baseSalary) });
      } else {
        logAudit({ action: "Edit", entityType: "Employee", entityName: `${updated.name} (${id})`, field: Object.keys(patch).join(","), oldValue: "—", newValue: "—" });
      }
      return updated;
    }));
  }, [logAudit]);

  const setEmployeeStatus = useCallback((id: string, status: Employee["status"]) => {
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      logAudit({ action: status === "Inactive" ? "Deactivate" : "Edit", entityType: "Employee", entityName: `${e.name} (${id})`, field: "status", oldValue: e.status, newValue: status });
      return { ...e, status };
    }));
  }, [logAudit]);

  const addBand: StoreCtx["addBand"] = useCallback((b) => {
    const id = `b-${Date.now()}`;
    setBands((prev) => [...prev, { ...b, id }]);
    logAudit({ action: "Create", entityType: "Band", entityName: `${b.jobTitle} / ${b.country}` });
  }, [logAudit]);

  const updateBand: StoreCtx["updateBand"] = useCallback((id, patch) => {
    setBands((prev) => prev.map((b) => {
      if (b.id !== id) return b;
      const updated = { ...b, ...patch };
      logAudit({ action: "Edit", entityType: "Band", entityName: `${updated.jobTitle} / ${updated.country}` });
      return updated;
    }));
  }, [logAudit]);

  const deleteBand = useCallback((id: string) => {
    setBands((prev) => {
      const b = prev.find((x) => x.id === id);
      if (b) logAudit({ action: "Deactivate", entityType: "Band", entityName: `${b.jobTitle} / ${b.country}` });
      return prev.filter((x) => x.id !== id);
    });
  }, [logAudit]);

  const upsertRate = useCallback((r: ExchangeRate) => {
    setRates((prev) => prev.map((x) => x.code === r.code ? { ...r, lastUpdated: new Date().toISOString() } : x));
    logAudit({ action: "Edit", entityType: "Exchange Rate", entityName: r.code, field: "rateToUsd", newValue: String(r.rateToUsd) });
  }, [logAudit]);

  const addRate = useCallback((r: ExchangeRate) => {
    setRates((prev) => [...prev, { ...r, lastUpdated: new Date().toISOString() }]);
    logAudit({ action: "Create", entityType: "Exchange Rate", entityName: r.code });
  }, [logAudit]);

  const addCycle: StoreCtx["addCycle"] = useCallback((c) => {
    const id = `RC-${Date.now()}`;
    setCycles((prev) => [...prev, { ...c, id, status: "Draft", proposals: [] }]);
    logAudit({ action: "Create", entityType: "Review Cycle", entityName: c.name });
  }, [logAudit]);

  const updateCycle: StoreCtx["updateCycle"] = useCallback((id, patch) => {
    setCycles((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const commitCycle = useCallback((id: string) => {
    setCycles((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      // apply proposals
      setEmployees((emps) => emps.map((emp) => {
        const prop = c.proposals.find((p) => p.employeeId === emp.id);
        if (!prop || prop.proposedIncreasePct === 0) return emp;
        const newSalary = Math.round(emp.baseSalary * (1 + prop.proposedIncreasePct / 100));
        const change = newSalary - emp.baseSalary;
        setHistory((h) => [
          { id: `H-${emp.id}-${Date.now()}-${Math.random()}`, employeeId: emp.id, effectiveDate: new Date().toISOString().slice(0, 10), baseSalary: newSalary, currency: emp.currency, changeAmount: change, changePct: prop.proposedIncreasePct, hrNote: c.name },
          ...h,
        ]);
        return { ...emp, baseSalary: newSalary };
      }));
      logAudit({ action: "Edit", entityType: "Review Cycle", entityName: c.name, field: "status", oldValue: c.status, newValue: "Completed" });
      return { ...c, status: "Completed" };
    }));
  }, [logAudit]);

  const getBandFor = useCallback((jobTitle: string, country: string) => {
    return bands.find((b) => b.jobTitle === jobTitle && b.country === country);
  }, [bands]);

  return (
    <Ctx.Provider value={{
      employees, history, bands, rates, cycles, audit,
      addEmployee, updateEmployee, setEmployeeStatus,
      addBand, updateBand, deleteBand,
      upsertRate, addRate,
      addCycle, updateCycle, commitCycle,
      logAudit, getBandFor,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function bandStatus(salary: number, band?: SalaryBand): "in" | "below" | "above" | "none" {
  if (!band) return "none";
  if (salary < band.min) return "below";
  if (salary > band.max) return "above";
  return "in";
}
