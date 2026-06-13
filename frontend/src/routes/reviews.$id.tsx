import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd, formatLocal, toUsd } from "@/lib/format";
import { StatusPill } from "./employees";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews/$id")({
  component: ReviewDetail,
});

function ReviewDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { cycles, employees, rates, updateCycle, commitCycle } = useStore();
  const cycle = cycles.find((c) => c.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!cycle) {
    return <div className="p-8">Cycle not found.</div>;
  }
  const c = cycle;
  const editable = c.status !== "Completed";

  const updateProposal = (empId: string, pct: number) => {
    const proposals = c.proposals.some((p) => p.employeeId === empId)
      ? c.proposals.map((p) => p.employeeId === empId ? { ...p, proposedIncreasePct: pct } : p)
      : [...c.proposals, { employeeId: empId, proposedIncreasePct: pct }];
    updateCycle(c.id, { proposals });
  };

  const updateBudget = (dept: string, pct: number) => {
    updateCycle(c.id, { budgets: c.budgets.map((b) => b.department === dept ? { ...b, budgetPct: pct } : b) });
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <Link to="/reviews" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cycles
      </Link>

      <div className="rounded-lg border border-border bg-card p-6 mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <StatusPill status={c.status} />
          </div>
          <p className="text-sm text-muted-foreground">Year {c.year}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(c.totalBudgetUsd)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Department Budgets</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left text-xs uppercase text-muted-foreground font-medium">
              <th className="px-6 py-3">Department</th>
              <th className="px-6 py-3 text-right">Headcount</th>
              <th className="px-6 py-3 text-right">Budget %</th>
              <th className="px-6 py-3 text-right">Budget Amount</th>
            </tr>
          </thead>
          <tbody>
            {c.budgets.map((b) => {
              const headcount = employees.filter((e) => e.department === b.department && e.status === "Active").length;
              const amount = (c.totalBudgetUsd * b.budgetPct) / 100;
              return (
                <tr key={b.department} className="border-t border-border">
                  <td className="px-6 py-3 font-medium">{b.department}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{headcount}</td>
                  <td className="px-6 py-3 text-right">
                    {editable
                      ? <Input type="number" className="w-20 ml-auto text-right" value={b.budgetPct} onChange={(e) => updateBudget(b.department, Number(e.target.value))} />
                      : `${b.budgetPct}%`}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">{formatUsd(amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Employee Proposals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase text-muted-foreground font-medium">
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3 text-right">Current Salary</th>
                <th className="px-6 py-3 text-right">Increase %</th>
                <th className="px-6 py-3 text-right">Proposed Salary</th>
              </tr>
            </thead>
            <tbody>
              {employees.filter((e) => e.status === "Active").map((e) => {
                const prop = c.proposals.find((p) => p.employeeId === e.id);
                const pct = prop?.proposedIncreasePct ?? 0;
                const newSal = Math.round(e.baseSalary * (1 + pct / 100));
                const usdCurrent = toUsd(e.baseSalary, e.currency, rates);
                const usdNew = toUsd(newSal, e.currency, rates);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-6 py-3 font-medium">{e.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{e.department}</td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      <div>{formatLocal(e.baseSalary, e.currency)}</div>
                      <div className="text-xs text-muted-foreground">{usdCurrent !== null ? formatUsd(usdCurrent) : "USD: N/A"}</div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {editable
                        ? <Input type="number" step="0.5" className="w-20 ml-auto text-right" value={pct} onChange={(ev) => updateProposal(e.id, Number(ev.target.value))} />
                        : `${pct}%`}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      <div>{formatLocal(newSal, e.currency)}</div>
                      <div className="text-xs text-muted-foreground">{usdNew !== null ? formatUsd(usdNew) : "USD: N/A"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border border-border">
        {c.status === "Draft" && (
          <Button onClick={() => { updateCycle(c.id, { status: "In Progress" }); toast.success("Cycle marked In Progress."); }}>Mark In Progress</Button>
        )}
        {c.status === "In Progress" && (
          <Button onClick={() => setConfirmOpen(true)}>Approve All & Commit</Button>
        )}
        {c.status === "Completed" && (
          <span className="text-sm text-muted-foreground self-center">This cycle has been committed and is locked.</span>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Commit {c.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {c.proposals.filter((p) => p.proposedIncreasePct !== 0).length} employee records will be updated. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              commitCycle(c.id);
              toast.success("Cycle committed. Salaries updated.");
              setConfirmOpen(false);
              navigate({ to: "/reviews" });
            }}>Commit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
