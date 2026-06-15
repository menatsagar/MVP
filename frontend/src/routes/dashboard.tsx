import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { formatUsd } from "@/lib/format";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ACME Salary" }] }),
  component: DashboardPage,
});

type GroupBy = "band" | "department" | "country";

interface DashboardSummary {
  total_headcount: number;
  total_annual_payroll_usd: number;
  average_base_salary_usd: number | null;
  median_base_salary_usd: number | null;
}

interface DistributionItem {
  group: string;
  employee_count: number;
  total_salary_usd?: number;
}

function getAuthToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
}

function DashboardPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("department");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8000/api/dashboard/summary/", {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    }
  }, []);

  const fetchDistribution = useCallback(async (group: GroupBy) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/dashboard/distribution/?group_by=${group}`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDistribution(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard distribution:", err);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchSummary(), fetchDistribution(groupBy)]).finally(() =>
      setIsLoading(false)
    );
  }, []);

  useEffect(() => {
    fetchDistribution(groupBy);
  }, [groupBy, fetchDistribution]);

  const chartData = distribution.map((d) => ({
    name: d.group === "no_band_defined" ? "No Band" :
          d.group === "below" ? "Below Band" :
          d.group === "within" ? "Within Band" :
          d.group === "above" ? "Above Band" : d.group,
    count: d.employee_count,
  }));

  if (isLoading || !summary) {
    return (
      <div className="p-8 max-w-[1400px]">
        <PageHeader title="Compensation Dashboard" subtitle="How ACME pays its people." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader title="Compensation Dashboard" subtitle="How ACME pays its people." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Headcount" value={summary.total_headcount.toString()} />
        <KpiCard label="Total Annual Payroll" value={formatUsd(parseFloat(String(summary.total_annual_payroll_usd)))} />
        <KpiCard label="Average Base Salary" value={summary.average_base_salary_usd ? formatUsd(parseFloat(String(summary.average_base_salary_usd))) : "N/A"} />
        <KpiCard label="Median Base Salary" value={summary.median_base_salary_usd ? formatUsd(parseFloat(String(summary.median_base_salary_usd))) : "N/A"} />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold">Employee Distribution</h2>
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
                  const total = summary.total_headcount;
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
