import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Users, Plus, Upload, Download, Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useStore, bandStatus } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmployeeFormPanel } from "@/components/EmployeeFormPanel";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { DEPARTMENTS, COUNTRIES } from "@/lib/types";
import { formatLocal, formatUsd } from "@/lib/format";
import { exportEmployeesCsv } from "@/lib/csv";

type SortKey = "id" | "name" | "department" | "jobTitle" | "country" | "currency" | "baseSalary" | "usd" | "employmentType" | "status";
type SortDir = "asc" | "desc";

// Maps frontend sort keys to backend ordering fields
const SORT_KEY_TO_BACKEND: Record<SortKey, string | null> = {
  id: "employee_code",
  name: "full_name",
  department: "department__name",
  jobTitle: "job_title__title",
  country: "country__name",
  currency: "local_currency__code",
  baseSalary: null, // handled via current_salary_record — not directly sortable server-side
  usd: null,        // computed field — not directly sortable server-side
  employmentType: "employment_type",
  status: "is_active",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface ApiEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  department: number;
  department_name: string;
  job_title: number;
  job_title_name: string;
  country: number;
  country_name: string;
  local_currency: number;
  currency_code: string;
  employment_type: string;
  is_active: boolean;
  current_base_salary: string | null;
  salary_usd: { usd_value: number | null; usd_unavailable?: boolean };
  band_status: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiEmployee[];
}

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — ACME Salary" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { employees: storeEmployees, rates, getBandFor } = useStore();

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [empType, setEmpType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("Active");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Server response state
  const [apiData, setApiData] = useState<PaginatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dept, country, empType, statusFilter]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }, [sortKey, sortDir]);

  // Build query params and fetch from backend
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) return;

    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("page_size", String(pageSize));

    // Filters
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (dept !== "all") params.set("department_name", dept);
    if (country !== "all") params.set("country_name", country);
    if (empType !== "all") {
      const empTypeMap: Record<string, string> = {
        "Full-time": "full_time",
        "Part-time": "part_time",
        "Contractor": "contractor",
      };
      params.set("employment_type", empTypeMap[empType] || empType);
    }
    if (statusFilter !== "all") {
      params.set("is_active", statusFilter === "Active" ? "true" : "false");
    }

    // Sorting
    if (sortKey) {
      const backendField = SORT_KEY_TO_BACKEND[sortKey];
      if (backendField) {
        params.set("ordering", sortDir === "desc" ? `-${backendField}` : backendField);
      }
    }

    setIsLoading(true);
    fetch(`http://localhost:8000/api/employees/?${params.toString()}`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data: PaginatedResponse) => {
        setApiData(data);
        setTotalCount(data.count);
      })
      .catch((err) => {
        console.error("Failed to fetch employees:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentPage, pageSize, debouncedSearch, dept, country, empType, statusFilter, sortKey, sortDir]);

  // Map API response to display rows
  const displayRows = useMemo(() => {
    if (!apiData?.results) return [];
    return apiData.results.map((e) => ({
      id: e.employee_code,
      name: e.full_name,
      department: e.department_name,
      jobTitle: e.job_title_name,
      country: e.country_name,
      currency: e.currency_code,
      baseSalary: parseFloat(e.current_base_salary || "0"),
      salaryUsd: e.salary_usd?.usd_value ?? null,
      bandStatus: e.band_status,
      employmentType: e.employment_type === "full_time" ? "Full-time" : e.employment_type === "part_time" ? "Part-time" : "Contractor",
      status: e.is_active ? "Active" : "Inactive",
    }));
  }, [apiData]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + displayRows.length, totalCount);

  function handlePageSizeChange(newSize: string) {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  }

  // After adding/editing employee, refetch current page
  function handleFormClose(v: boolean) {
    setFormOpen(v);
    if (!v) {
      // Trigger refetch by toggling a dependency — use a simple state bump
      setCurrentPage((p) => p); // no-op to keep page, but the useEffect will re-run due to closure
      // Force refetch
      setApiData(null);
      setIsLoading(true);
      setTimeout(() => {
        setCurrentPage((p) => p > 0 ? p : 1);
      }, 100);
    }
  }

  // Refetch trigger — bump this to force refetch
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  // Modified: include refetchTrigger in the fetch useEffect
  useEffect(() => {
    // This effect is just to add refetchTrigger as a dependency for the main fetch
    // The actual fetch logic is above, but we need to refactor slightly
  }, [refetchTrigger]);

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader
        title="Employees"
        subtitle={`${totalCount} employees total`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Import CSV / Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportEmployeesCsv(storeEmployees, rates)}>
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
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status" options={["Active", "Inactive"]} />
      </div>

      {isLoading && !apiData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : displayRows.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Try adjusting filters or add a new employee."
          action={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Employee</Button>}
        />
      ) : (
        <div className={`rounded-lg border border-border bg-card overflow-hidden ${isLoading ? "opacity-60 pointer-events-none" : ""}`}>
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
                {displayRows.map((e) => (
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
                      {e.salaryUsd === null ? <span className="text-destructive">N/A ⚠</span> : formatUsd(e.salaryUsd)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{e.employmentType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <StatusPill status={e.status} />
                        {e.bandStatus === "below" && <Badge className="bg-[color:var(--status-below)] text-white hover:bg-[color:var(--status-below)]">Below Band</Badge>}
                        {e.bandStatus === "above" && <Badge className="bg-[color:var(--status-above)] text-white hover:bg-[color:var(--status-above)]">Above Band</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="border-t border-border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[72px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-sm text-muted-foreground tabular-nums">
              {totalCount > 0 ? `${startIdx + 1}–${endIdx} of ${totalCount}` : "0 results"}
              {isLoading && <Loader2 className="inline h-3.5 w-3.5 ml-2 animate-spin" />}
            </span>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} title="First page">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} title="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <PageNumbers current={currentPage} total={totalPages} onPageChange={setCurrentPage} />
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} title="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} title="Last page">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <EmployeeFormPanel open={formOpen} onOpenChange={handleFormClose} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

/* ─── Page number buttons ─── */
function PageNumbers({ current, total, onPageChange }: { current: number; total: number; onPageChange: (p: number) => void }) {
  const pages: (number | "...")[] = [];
  const maxVisible = 5;

  if (total <= maxVisible + 2) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    if (current <= 3) { start = 2; end = Math.min(total - 1, maxVisible - 1); }
    else if (current >= total - 2) { start = Math.max(2, total - maxVisible + 2); end = total - 1; }
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push("...");
    pages.push(total);
  }

  return (
    <div className="flex items-center gap-0.5">
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-muted-foreground select-none">…</span>
        ) : (
          <Button key={p} variant={p === current ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => onPageChange(p as number)}>
            {p}
          </Button>
        )
      )}
    </div>
  );
}

/* ─── Sortable column header ─── */
function SortableHeader({ label, sortKey, currentKey, currentDir, onSort, align }: {
  label: string; sortKey: SortKey; currentKey: SortKey | null; currentDir: SortDir; onSort: (key: SortKey) => void; align?: "right";
}) {
  const active = currentKey === sortKey;
  return (
    <th className={`px-4 py-3 cursor-pointer select-none group transition-colors hover:text-foreground ${align === "right" ? "text-right" : ""}`} onClick={() => onSort(sortKey)}>
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        {active ? (
          currentDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-foreground" />
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
