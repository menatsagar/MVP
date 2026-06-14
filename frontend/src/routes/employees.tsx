import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { Users, Plus, Upload, Download, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useStore, bandStatus } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmployeeFormPanel } from "@/components/EmployeeFormPanel";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { DEPARTMENTS, COUNTRIES } from "@/lib/types";
import { formatLocal, formatUsd, toUsd } from "@/lib/format";
import { exportEmployeesCsv } from "@/lib/csv";
import type { Employee } from "@/lib/types";

type SortKey = "id" | "name" | "department" | "jobTitle" | "country" | "currency" | "baseSalary" | "usd" | "employmentType" | "status";
type SortDir = "asc" | "desc";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — ACME Salary" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { employees, rates, getBandFor } = useStore();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [empType, setEmpType] = useState<string>("all");
  const [status, setStatus] = useState<string>("Active");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey, sortDir]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (dept !== "all" && e.department !== dept) return false;
      if (country !== "all" && e.country !== country) return false;
      if (empType !== "all" && e.employmentType !== empType) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!e.name.toLowerCase().includes(s) && !e.id.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [employees, search, dept, country, empType, status]);

  const sorted = useMemo(() => {
    // Default: newest first (by createdAt descending)
    if (!sortKey) {
      return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortKey === "usd") {
        aVal = toUsd(a.baseSalary, a.currency, rates) ?? -Infinity;
        bVal = toUsd(b.baseSalary, b.currency, rates) ?? -Infinity;
      } else if (sortKey === "baseSalary") {
        aVal = a.baseSalary;
        bVal = b.baseSalary;
      } else {
        aVal = (a[sortKey as keyof Employee] as string ?? "").toString().toLowerCase();
        bVal = (b[sortKey as keyof Employee] as string ?? "").toString().toLowerCase();
      }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir, rates]);

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader
        title="Employees"
        subtitle={`${filtered.length} of ${employees.length} employees`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportEmployeesCsv(employees, rates)}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Employee
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <FilterSelect value={dept} onChange={setDept} placeholder="Department" options={DEPARTMENTS} />
        <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={COUNTRIES.map((c) => c.name)} />
        <FilterSelect value={empType} onChange={setEmpType} placeholder="Employment" options={["Full-time", "Part-time", "Contractor"]} />
        <FilterSelect value={status} onChange={setStatus} placeholder="Status" options={["Active", "Inactive"]} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Try adjusting filters or add a new employee."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Employee</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 sticky top-0">
                <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <SortableHeader label="ID" sortKey="id" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Department" sortKey="department" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Job Title" sortKey="jobTitle" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Country" sortKey="country" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Currency" sortKey="currency" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Base Salary" sortKey="baseSalary" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
                  <SortableHeader label="USD Equiv." sortKey="usd" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} align="right" />
                  <SortableHeader label="Type" sortKey="employmentType" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => {
                  const usd = toUsd(e.baseSalary, e.currency, rates);
                  const band = getBandFor(e.jobTitle, e.country);
                  const bs = bandStatus(e.baseSalary, band);
                  return (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.id}</td>
                      <td className="px-4 py-3">
                        <Link to="/employees/$id" params={{ id: e.id }} className="font-medium text-foreground hover:text-primary">
                          {e.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.department}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.jobTitle}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.country}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.currency}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatLocal(e.baseSalary, e.currency)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {usd === null ? <span className="text-destructive">N/A ⚠</span> : formatUsd(usd)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{e.employmentType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <StatusPill status={e.status} />
                          {bs === "below" && <Badge className="bg-[color:var(--status-below)] text-white hover:bg-[color:var(--status-below)]">Below Band</Badge>}
                          {bs === "above" && <Badge className="bg-[color:var(--status-above)] text-white hover:bg-[color:var(--status-above)]">Above Band</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EmployeeFormPanel open={formOpen} onOpenChange={setFormOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

/* ─── Sortable column header ─── */
function SortableHeader({ label, sortKey, currentKey, currentDir, onSort, align }: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={`px-4 py-3 cursor-pointer select-none group transition-colors hover:text-foreground ${align === "right" ? "text-right" : ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        {active ? (
          currentDir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 text-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-foreground" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </span>
    </th>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-[color:var(--status-active)] text-white",
    Inactive: "bg-[color:var(--status-inactive)] text-white",
    Draft: "bg-muted text-foreground",
    "In Progress": "bg-[color:var(--status-progress)] text-white",
    Completed: "bg-[color:var(--status-completed)] text-white",
  };
  return <Badge className={`${map[status] || "bg-muted"} hover:opacity-90 border-0`}>{status}</Badge>;
}
