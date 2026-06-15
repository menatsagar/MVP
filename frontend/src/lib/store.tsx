import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type {
  Employee, SalaryBand, ExchangeRate, ReviewCycle, AuditEntry,
  SalaryHistoryEntry,
} from "./types";

interface StoreCtx {
  employees: Employee[];
  history: SalaryHistoryEntry[];
  bands: SalaryBand[];
  rates: ExchangeRate[];
  cycles: ReviewCycle[];
  audit: AuditEntry[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  addEmployee: (e: Omit<Employee, "id"> & { id?: string }) => Promise<void>;
  updateEmployee: (id: string, patch: Partial<Employee>, note: string) => Promise<void>;
  setEmployeeStatus: (id: string, status: Employee["status"]) => Promise<void>;
  addBand: (b: Omit<SalaryBand, "id">) => Promise<void>;
  updateBand: (id: string, patch: Partial<SalaryBand>) => Promise<void>;
  deleteBand: (id: string) => Promise<void>;
  upsertRate: (r: ExchangeRate) => Promise<void>;
  addRate: (r: ExchangeRate) => Promise<void>;
  addCycle: (c: Omit<ReviewCycle, "id" | "status" | "proposals">) => Promise<void>;
  updateCycle: (id: string, patch: Partial<ReviewCycle>) => Promise<void>;
  commitCycle: (id: string) => Promise<void>;
  logAudit: (e: Omit<AuditEntry, "id" | "timestamp" | "user">) => void;
  getBandFor: (jobTitle: string, country: string) => SalaryBand | undefined;
  refDepts: { id: number; name: string }[];
  refCountries: { id: number; name: string; default_currency: number; default_currency_code: string }[];
  refJobTitles: { id: number; title: string; department: number; department_name: string }[];
  refCurrencies: { id: number; code: string; name: string; rate_to_usd: string }[];
}

const Ctx = createContext<StoreCtx | null>(null);

const isBrowser = typeof window !== "undefined";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => isBrowser ? localStorage.getItem("auth_token") : null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [history, setHistory] = useState<SalaryHistoryEntry[]>([]);
  const [bands, setBands] = useState<SalaryBand[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const isAuthenticated = !!token;

  const logout = useCallback(() => {
    setToken(null);
    if (isBrowser) {
      localStorage.removeItem("auth_token");
    }
    setEmployees([]);
    setHistory([]);
    setBands([]);
    setRates([]);
    setCycles([]);
    setAudit([]);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("http://localhost:8000/api/auth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      let errorMsg = "Login failed. Please check your credentials.";
      try {
        const parsed = JSON.parse(text);
        if (parsed.non_field_errors) {
          errorMsg = parsed.non_field_errors.join(" ");
        } else if (parsed.detail) {
          errorMsg = parsed.detail;
        }
      } catch {}
      throw new Error(errorMsg);
    }
    const data = await res.json();
    setToken(data.token);
    if (isBrowser) {
      localStorage.setItem("auth_token", data.token);
    }
  }, []);

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Token ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(`http://localhost:8000/api${path}`, {
      ...options,
      headers,
    });
    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }, [token, logout]);

  // Cache reference data mapping lists
  const [refDepts, setRefDepts] = useState<{ id: number; name: string }[]>([]);
  const [refCountries, setRefCountries] = useState<{ id: number; name: string; default_currency: number; default_currency_code: string }[]>([]);
  const [refJobTitles, setRefJobTitles] = useState<{ id: number; title: string; department: number; department_name: string }[]>([]);
  const [refCurrencies, setRefCurrencies] = useState<{ id: number; code: string; name: string; rate_to_usd: string }[]>([]);

  const logAudit = useCallback((e: Omit<AuditEntry, "id" | "timestamp" | "user">) => {
    // Audit logs are read-only via API and created on the backend.
    // Client-side local append-only logging is kept as a fallback.
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

  const refreshData = useCallback(async () => {
    try {
      // 1. Fetch metadata references and currencies in a single options request
      const optionsRes = await apiRequest("/employees/options/");
      const deptsData = optionsRes?.departments || [];
      setRefDepts(deptsData);
      const countriesData = optionsRes?.countries || [];
      setRefCountries(countriesData);
      const jobTitlesData = optionsRes?.job_titles || [];
      setRefJobTitles(jobTitlesData);
      const currenciesData = optionsRes?.currencies || [];
      setRefCurrencies(currenciesData);

      const mappedRates = currenciesData.map((c: any) => ({
        code: c.code,
        name: c.name,
        rateToUsd: parseFloat(c.rate_to_usd),
        lastUpdated: c.last_updated,
      }));
      setRates(mappedRates);

      // 2. Fetch salary bands
      const bandsRes = await apiRequest("/salary-bands/?page_size=1000");
      const bandsData = bandsRes?.results || bandsRes || [];
      const mappedBands = bandsData.map((b: any) => ({
        id: String(b.id),
        jobTitle: b.job_title_name || (b.job_title ? String(b.job_title) : ""),
        country: b.country_name || (b.country ? String(b.country) : ""),
        currency: b.currency_code || (b.currency ? String(b.currency) : ""),
        min: parseFloat(b.min_salary),
        mid: parseFloat(b.mid_salary),
        max: parseFloat(b.max_salary),
      }));
      setBands(mappedBands);

      // 3. Fetch a lightweight employee list (no per-employee salary-records calls!)
      //    This is only used for CSV export and reviews.
      //    The employees LIST page fetches its own paginated data directly.
      const employeesResponse = await apiRequest("/employees/?page_size=1000");
      const employeesList = employeesResponse.results || [];

      const mappedEmployees: Employee[] = employeesList.map((e: any) => ({
        id: e.employee_code,
        name: e.full_name,
        department: e.department_name,
        jobTitle: e.job_title_name,
        country: e.country_name,
        currency: e.currency_code,
        baseSalary: parseFloat(e.current_base_salary || "0"),
        bonusPct: 0,
        effectiveDate: "",
        employmentType: e.employment_type === "full_time" ? "Full-time" : e.employment_type === "part_time" ? "Part-time" : "Contractor",
        hrNote: "",
        status: e.is_active ? "Active" : "Inactive",
        createdAt: e.created_at || "",
      }));
      setEmployees(mappedEmployees);
      // NOTE: Salary history is no longer fetched here.
      // It is loaded on-demand on the employee detail page.
      setHistory([]);

      // 4. Fetch review cycles
      const cyclesRes = await apiRequest("/review-cycles/?page_size=1000");
      const cyclesData = cyclesRes?.results || cyclesRes || [];
      const fullCycles = await Promise.all(cyclesData.map(async (c: any) => {
        const detail = await apiRequest(`/review-cycles/${c.id}/`);
        
        let totalBudgetUsd = 0;
        for (const p of detail.proposals) {
          const emp = employeesList.find((x: any) => x.employee_code === p.employee_code);
          if (emp) {
            const currencyObj = currenciesData.find((curr: any) => curr.code === emp.currency_code);
            const rate = currencyObj ? parseFloat(currencyObj.rate_to_usd) : 1;
            totalBudgetUsd += parseFloat(p.current_salary) * rate;
          }
        }

        return {
          id: String(detail.id),
          name: detail.name,
          year: detail.year,
          status: detail.status === "draft" ? "Draft" : detail.status === "in_progress" ? "In Progress" : "Completed",
          budgets: detail.department_budgets.map((b: any) => ({
            department: b.department_name,
            budgetPct: parseFloat(b.budget_pct),
          })),
          proposals: detail.proposals.map((p: any) => ({
            employeeId: p.employee_code,
            proposedIncreasePct: parseFloat(p.proposed_increase_pct),
          })),
          totalBudgetUsd,
        };
      }));
      setCycles(fullCycles);

      // 5. Fetch audit logs
      const auditData = await apiRequest("/audit-log/?page_size=1000");
      const mappedAudit = (auditData.results || []).map((a: any) => ({
        id: String(a.id),
        timestamp: a.timestamp,
        action: a.action === "create" ? "Create" : a.action === "update" ? "Edit" : "Deactivate",
        entityType: a.entity_type === "employee" ? "Employee" : a.entity_type === "salary_band" ? "Band" : a.entity_type === "review_cycle" ? "Review Cycle" : "Exchange Rate",
        entityName: a.entity_label,
        field: a.field_changed || undefined,
        oldValue: a.old_value || undefined,
        newValue: a.new_value || undefined,
        user: a.acting_user,
      }));
      setAudit(mappedAudit);

    } catch (err) {
      console.error("Failed to refresh store data from backend:", err);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (isBrowser && token) {
      refreshData();
    }
  }, [refreshData, token]);

  const addEmployee: StoreCtx["addEmployee"] = useCallback(async (e) => {
    const deptId = refDepts.find(d => d.name === e.department)?.id;
    const country = refCountries.find(c => c.name === e.country);
    const countryId = country?.id;
    const jobTitleId = refJobTitles.find(j => j.title === e.jobTitle && j.department === deptId)?.id;
    const currencyId = refCurrencies.find(c => c.code === e.currency)?.id || country?.default_currency;

    const payload = {
      full_name: e.name,
      department: deptId,
      job_title: jobTitleId,
      country: countryId,
      local_currency: currencyId,
      employment_type: e.employmentType === "Full-time" ? "full_time" : e.employmentType === "Part-time" ? "part_time" : "contractor",
      base_salary: String(e.baseSalary),
      effective_date: e.effectiveDate,
      variable_bonus_pct: String(e.bonusPct || 0),
      hr_note: e.hrNote || "Initial salary",
    };

    await apiRequest("/employees/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await refreshData();
  }, [refDepts, refCountries, refJobTitles, refCurrencies, refreshData]);

  const updateEmployee: StoreCtx["updateEmployee"] = useCallback(async (id, patch, note) => {
    // 1. If base salary or bonus changed, add a new SalaryRecord
    if (patch.baseSalary !== undefined) {
      await apiRequest(`/employees/${id}/salary-records/`, {
        method: "POST",
        body: JSON.stringify({
          base_salary: String(patch.baseSalary),
          variable_bonus_pct: String(patch.bonusPct ?? 0),
          effective_date: patch.effectiveDate || new Date().toISOString().slice(0, 10),
          hr_note: note,
        }),
      });
    }

    // 2. Profile changes
    const updatePayload: any = {};
    if (patch.name !== undefined) updatePayload.full_name = patch.name;
    if (patch.department !== undefined) updatePayload.department = refDepts.find(d => d.name === patch.department)?.id;
    if (patch.jobTitle !== undefined) {
      const dName = patch.department || employees.find(x => x.id === id)?.department;
      const dId = refDepts.find(d => d.name === dName)?.id;
      updatePayload.job_title = refJobTitles.find(j => j.title === patch.jobTitle && j.department === dId)?.id;
    }
    if (patch.country !== undefined) updatePayload.country = refCountries.find(c => c.name === patch.country)?.id;
    if (patch.currency !== undefined) updatePayload.local_currency = refCurrencies.find(c => c.code === patch.currency)?.id;
    if (patch.employmentType !== undefined) {
      updatePayload.employment_type = patch.employmentType === "Full-time" ? "full_time" : patch.employmentType === "Part-time" ? "part_time" : "contractor";
    }

    if (Object.keys(updatePayload).length > 0) {
      await apiRequest(`/employees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload),
      });
    }
    await refreshData();
  }, [employees, refDepts, refCountries, refJobTitles, refCurrencies, refreshData]);

  const setEmployeeStatus = useCallback(async (id: string, status: Employee["status"]) => {
    if (status === "Inactive") {
      await apiRequest(`/employees/${id}/deactivate/`, { method: "POST" });
    } else {
      await apiRequest(`/employees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true }),
      });
    }
    await refreshData();
  }, [refreshData]);

  const addBand: StoreCtx["addBand"] = useCallback(async (b) => {
    const countryId = refCountries.find(c => c.name === b.country)?.id;
    const jobTitleId = refJobTitles.find(j => j.title === b.jobTitle)?.id;
    const currencyId = refCurrencies.find(c => c.code === b.currency)?.id;

    await apiRequest("/salary-bands/", {
      method: "POST",
      body: JSON.stringify({
        job_title: jobTitleId,
        country: countryId,
        min_salary: String(b.min),
        mid_salary: String(b.mid),
        max_salary: String(b.max),
        currency: currencyId,
      }),
    });
    await refreshData();
  }, [refCountries, refJobTitles, refCurrencies, refreshData]);

  const updateBand: StoreCtx["updateBand"] = useCallback(async (id, patch) => {
    const bandPayload: any = {};
    if (patch.min !== undefined) bandPayload.min_salary = String(patch.min);
    if (patch.mid !== undefined) bandPayload.mid_salary = String(patch.mid);
    if (patch.max !== undefined) bandPayload.max_salary = String(patch.max);
    if (patch.currency !== undefined) bandPayload.currency = refCurrencies.find(c => c.code === patch.currency)?.id;

    await apiRequest(`/salary-bands/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(bandPayload),
    });
    await refreshData();
  }, [refCurrencies, refreshData]);

  const deleteBand = useCallback(async (id: string) => {
    await apiRequest(`/salary-bands/${id}/`, { method: "DELETE" });
    await refreshData();
  }, [refreshData]);

  const upsertRate = useCallback(async (r: ExchangeRate) => {
    const currencyId = refCurrencies.find(c => c.code === r.code)?.id;
    if (currencyId) {
      await apiRequest(`/settings/currencies/${currencyId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          rate_to_usd: String(r.rateToUsd),
        }),
      });
    }
    await refreshData();
  }, [refCurrencies, refreshData]);

  const addRate = useCallback(async (r: ExchangeRate) => {
    await apiRequest("/settings/currencies/", {
      method: "POST",
      body: JSON.stringify({
        code: r.code,
        name: r.name,
        rate_to_usd: String(r.rateToUsd),
      }),
    });
    await refreshData();
  }, [refreshData]);

  const addCycle: StoreCtx["addCycle"] = useCallback(async (c) => {
    const budgets = (c.budgets || []).map(b => ({
      department: refDepts.find(d => d.name === b.department)?.id,
      budget_pct: String(b.budgetPct),
    }));

    await apiRequest("/review-cycles/", {
      method: "POST",
      body: JSON.stringify({
        name: c.name,
        year: c.year,
        department_budgets: budgets,
      }),
    });
    await refreshData();
  }, [refDepts, refreshData]);

  const updateCycle: StoreCtx["updateCycle"] = useCallback(async (id, patch) => {
    const cycleObj = cycles.find(x => x.id === id);
    if (!cycleObj) return;

    if (patch.status === "In Progress") {
      await apiRequest(`/review-cycles/${id}/transition/`, {
        method: "POST",
        body: JSON.stringify({ status: "in_progress" }),
      });
    }

    if (patch.proposals !== undefined) {
      const oldProposals = cycleObj.proposals;
      const newProposals = patch.proposals;
      const detail = await apiRequest(`/review-cycles/${id}/`);

      for (const newProp of newProposals) {
        const oldProp = oldProposals.find(p => p.employeeId === newProp.employeeId);
        if (!oldProp || oldProp.proposedIncreasePct !== newProp.proposedIncreasePct) {
          const backendProp = detail.proposals.find((p: any) => p.employee_code === newProp.employeeId);
          if (backendProp) {
            await apiRequest(`/review-cycles/${id}/proposals/${backendProp.id}/`, {
              method: "PATCH",
              body: JSON.stringify({ proposed_increase_pct: newProp.proposedIncreasePct }),
            });
          }
        }
      }
    }

    if (patch.budgets !== undefined) {
      const oldBudgets = cycleObj.budgets;
      const newBudgets = patch.budgets;
      const detail = await apiRequest(`/review-cycles/${id}/`);

      for (const newB of newBudgets) {
        const oldB = oldBudgets.find(b => b.department === newB.department);
        if (!oldB || oldB.budgetPct !== newB.budgetPct) {
          const backendB = detail.department_budgets.find((b: any) => b.department_name === newB.department);
          if (backendB) {
            await apiRequest(`/review-cycles/${id}/budgets/${backendB.id}/`, {
              method: "PATCH",
              body: JSON.stringify({ budget_pct: newB.budgetPct }),
            });
          }
        }
      }
    }

    await refreshData();
  }, [cycles, refreshData]);

  const commitCycle = useCallback(async (id: string) => {
    await apiRequest(`/review-cycles/${id}/transition/`, {
      method: "POST",
      body: JSON.stringify({ status: "completed" }),
    });
    await refreshData();
  }, [refreshData]);

  const getBandFor = useCallback((jobTitle: string, country: string) => {
    return bands.find((b) => b.jobTitle === jobTitle && b.country === country);
  }, [bands]);

  return (
    <Ctx.Provider value={{
      employees, history, bands, rates, cycles, audit,
      isAuthenticated, login, logout,
      addEmployee, updateEmployee, setEmployeeStatus,
      addBand, updateBand, deleteBand,
      upsertRate, addRate,
      addCycle, updateCycle, commitCycle,
      logAudit, getBandFor,
      refDepts, refCountries, refJobTitles, refCurrencies,
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
