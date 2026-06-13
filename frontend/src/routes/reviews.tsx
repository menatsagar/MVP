import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEPARTMENTS } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { StatusPill } from "./employees";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Salary Reviews — ACME Salary" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { cycles, employees, addCycle } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Salary Reviews"
        subtitle="Plan and commit organization-wide compensation adjustments."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Review Cycle</Button>}
      />

      {cycles.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No review cycles yet" description="Create your first review cycle." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Cycle</Button>} />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase text-muted-foreground font-medium">
                <th className="px-4 py-3">Cycle Name</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Headcount</th>
                <th className="px-4 py-3 text-right">Total Budget</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link to="/reviews/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.year}</td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{employees.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUsd(c.totalBudgetUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewCycleDialog open={open} onClose={() => setOpen(false)} onCreate={(payload) => {
        addCycle(payload);
        toast.success("Review cycle created.");
        setOpen(false);
      }} />
    </div>
  );
}

function NewCycleDialog({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void; onCreate: (c: { name: string; year: number; totalBudgetUsd: number; budgets: { department: string; budgetPct: number }[] }) => void;
}) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [budget, setBudget] = useState(100000);
  const [budgets, setBudgets] = useState(DEPARTMENTS.map((d) => ({ department: d, budgetPct: Math.round(100 / DEPARTMENTS.length) })));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Review Cycle</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Cycle Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual 2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
            <div><Label>Total Budget (USD)</Label><Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></div>
          </div>
          <div>
            <Label>Department Budget %</Label>
            <div className="rounded-md border border-border mt-1">
              {budgets.map((b, i) => (
                <div key={b.department} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0">
                  <span className="flex-1 text-sm">{b.department}</span>
                  <Input type="number" className="w-24" value={b.budgetPct}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBudgets((p) => p.map((x, idx) => idx === i ? { ...x, budgetPct: v } : x));
                    }} />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!name) { toast.error("Name required"); return; }
            onCreate({ name, year, totalBudgetUsd: budget, budgets });
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
