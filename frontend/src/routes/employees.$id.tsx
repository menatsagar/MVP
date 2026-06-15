import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit3, Power, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore, bandStatus } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { formatLocalWithUsd, formatLocal, formatUsd, toUsd } from "@/lib/format";
import { EmployeeFormPanel } from "@/components/EmployeeFormPanel";
import { StatusPill } from "./employees";
import type { SalaryHistoryEntry } from "@/lib/types";

export const Route = createFileRoute("/employees/$id")({
  component: EmployeeDetail,
});

function EmployeeDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { employees, rates, getBandFor, setEmployeeStatus } = useStore();
  const emp = employees.find((e) => e.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch salary history on-demand for this specific employee
  useEffect(() => {
    if (!id) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) return;

    setHistoryLoading(true);
    fetch(`http://localhost:8000/api/employees/${id}/salary-records/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((recs: any[]) => {
        // Sort chronologically (oldest first) to compute change percentages
        recs.sort((a, b) => a.effective_date.localeCompare(b.effective_date));
        let prevSalary = 0;
        const mapped: SalaryHistoryEntry[] = recs.map((r) => {
          const baseSalary = parseFloat(r.base_salary);
          const changeAmount = prevSalary > 0 ? baseSalary - prevSalary : 0;
          const changePct = prevSalary > 0 ? (changeAmount / prevSalary) * 100 : 0;
          prevSalary = baseSalary;
          return {
            id: String(r.id),
            employeeId: id,
            effectiveDate: r.effective_date,
            baseSalary,
            currency: emp?.currency || "",
            changeAmount,
            changePct,
            hrNote: r.hr_note || "",
          };
        });
        // Show newest first in the table
        setSalaryHistory(mapped.reverse());
      })
      .catch((err) => {
        console.error(`Failed to fetch salary history for ${id}:`, err);
        setSalaryHistory([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [id, emp?.currency]);

  if (!emp) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Employee not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/employees" })}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to employees
        </Button>
      </div>
    );
  }

  const band = getBandFor(emp.jobTitle, emp.country);
  const bs = bandStatus(emp.baseSalary, band);

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/employees" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to employees
      </Link>

      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">{emp.name}</h1>
              <StatusPill status={emp.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{emp.id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEmployeeStatus(emp.id, emp.status === "Active" ? "Inactive" : "Active")}>
              <Power className="h-4 w-4 mr-1.5" /> {emp.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Edit3 className="h-4 w-4 mr-1.5" /> Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Field label="Department" value={emp.department} />
          <Field label="Job Title" value={emp.jobTitle} />
          <Field label="Country" value={emp.country} />
          <Field label="Currency" value={emp.currency} />
          <Field label="Base Salary" value={formatLocalWithUsd(emp.baseSalary, emp.currency, rates)} />
          <Field label="Bonus Target" value={`${emp.bonusPct}%`} />
          <Field label="Effective Date" value={emp.effectiveDate || "—"} />
          <Field label="Employment Type" value={emp.employmentType} />
        </div>
      </div>

      {bs !== "in" && bs !== "none" && band && (
        <div className={`mb-6 rounded-lg border p-4 ${bs === "below" ? "bg-[color:var(--status-below)]/10 border-[color:var(--status-below)]/30" : "bg-[color:var(--status-above)]/10 border-[color:var(--status-above)]/30"}`}>
          <p className="text-sm font-medium text-foreground">
            ⚠ Salary is {bs} the defined band for {emp.jobTitle} / {emp.country}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Band range: {formatLocal(band.min, band.currency)} – {formatLocal(band.max, band.currency)}.
            Current: {formatLocal(emp.baseSalary, emp.currency)}
            {" "}({bs === "below" ? `${formatLocal(band.min - emp.baseSalary, band.currency)} below min` : `${formatLocal(emp.baseSalary - band.max, band.currency)} above max`}).
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Salary History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Append-only record of compensation changes.</p>
        </div>
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : salaryHistory.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No salary history records found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="px-6 py-3">Effective Date</th>
                <th className="px-6 py-3 text-right">Base Salary</th>
                <th className="px-6 py-3 text-right">USD Equiv.</th>
                <th className="px-6 py-3 text-right">Change</th>
                <th className="px-6 py-3 text-right">Change %</th>
                <th className="px-6 py-3">HR Note</th>
              </tr>
            </thead>
            <tbody>
              {salaryHistory.map((h) => {
                const usd = toUsd(h.baseSalary, h.currency, rates);
                return (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-6 py-3">{h.effectiveDate}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{formatLocal(h.baseSalary, h.currency)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">{usd === null ? "—" : formatUsd(usd)}</td>
                    <td className={`px-6 py-3 text-right tabular-nums ${h.changeAmount > 0 ? "text-[color:var(--status-active)]" : h.changeAmount < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {h.changeAmount === 0 ? "—" : (h.changeAmount > 0 ? "+" : "") + formatLocal(h.changeAmount, h.currency)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">{h.changePct === 0 ? "—" : `${h.changePct > 0 ? "+" : ""}${h.changePct.toFixed(1)}%`}</td>
                    <td className="px-6 py-3 text-muted-foreground">{h.hrNote}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <EmployeeFormPanel open={editOpen} onOpenChange={setEditOpen} employee={emp} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}
