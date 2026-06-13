import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { toUsd, formatUsd } from "@/lib/format";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ACME Salary" }] }),
  component: DashboardPage,
});

type GroupBy = "band" | "department" | "country";

function DashboardPage() {
  const { employees, rates } = useStore();
  const [groupBy, setGroupBy] = useState<GroupBy>("band");

  const active = employees.filter((e) => e.status === "Active");
  const usdSalaries = active.map((e) => toUsd(e.baseSalary, e.currency, rates) ?? 0);
  const totalPayroll = usdSalaries.reduce((a, b) => a + b, 0);
  const avg = usdSalaries.length ? totalPayroll / usdSalaries.length : 0;
  const median = (() => {
    if (!usdSalaries.length) return 0;
    const s = [...usdSalaries].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  })();

  const chartData = useMemo(() => {
    if (groupBy === "band") {
      const buckets = [
        { label: "<$50k", min: 0, max: 50000 },
        { label: "$50-100k", min: 50000, max: 100000 },
        { label: "$100-150k", min: 100000, max: 150000 },
        { label: "$150-200k", min: 150000, max: 200000 },
        { label: "$200-250k", min: 200000, max: 250000 },
        { label: ">$250k", min: 250000, max: Infinity },
      ];
      return buckets.map((b) => ({
        name: b.label,
        count: active.filter((e) => {
          const u = toUsd(e.baseSalary, e.currency, rates) ?? 0;
          return u >= b.min && u < b.max;
        }).length,
      }));
    }
    const key = groupBy === "department" ? "department" : "country";
    const groups = new Map<string, number>();
    active.forEach((e) => {
      groups.set(e[key], (groups.get(e[key]) || 0) + 1);
    });
    return [...groups.entries()].map(([name, count]) => ({ name, count }));
  }, [active, rates, groupBy]);

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader title="Compensation Dashboard" subtitle="How ACME pays its people." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Headcount" value={active.length.toString()} />
        <KpiCard label="Total Annual Payroll" value={formatUsd(totalPayroll)} />
        <KpiCard label="Average Base Salary" value={formatUsd(avg)} />
        <KpiCard label="Median Base Salary" value={formatUsd(median)} />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold">Salary Distribution</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Headcount grouped by selected dimension.</p>
          </div>
          <ToggleGroup type="single" value={groupBy} onValueChange={(v) => v && setGroupBy(v as GroupBy)} variant="outline">
            <ToggleGroupItem value="band">By Band</ToggleGroupItem>
            <ToggleGroupItem value="department">By Department</ToggleGroupItem>
            <ToggleGroupItem value="country">By Country</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="oklch(0.5 0.02 257)" />
              <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.5 0.02 257)" allowDecimals={false} />
              <Tooltip
                content={({ active: act, payload }) => {
                  if (!act || !payload?.length) return null;
                  const total = active.length;
                  const count = payload[0].value as number;
                  return (
                    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md text-xs">
                      <p className="font-semibold">{payload[0].payload.name}</p>
                      <p className="text-muted-foreground">{count} employees · {total ? ((count / total) * 100).toFixed(1) : 0}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
