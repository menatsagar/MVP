import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseCsv, downloadSampleCsv } from "@/lib/csv";
import { Download, CheckCircle2, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { COUNTRIES, DEPARTMENTS, JOB_TITLES, type Employee } from "@/lib/types";
import { toast } from "sonner";

type Parsed = { row: Record<string, string>; valid: boolean; error?: string };

export function ImportCsvDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addEmployee } = useStore();
  const [parsed, setParsed] = useState<Parsed[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ""));
      if (rows.length < 2) { toast.error("Empty CSV"); return; }
      const head = rows[0].map((h) => h.trim());
      setHeaders(head);
      const data = rows.slice(1).map((r) => {
        const rec: Record<string, string> = {};
        head.forEach((h, i) => { rec[h] = (r[i] || "").trim(); });
        const err = validate(rec);
        return { row: rec, valid: !err, error: err };
      });
      setParsed(data);
    };
    reader.readAsText(file);
  }

  function confirm() {
    const valid = (parsed || []).filter((p) => p.valid);
    valid.forEach((p) => {
      const c = COUNTRIES.find((x) => x.name === p.row.country);
      const emp: Omit<Employee, "id"> = {
        name: p.row.name,
        department: p.row.department,
        jobTitle: p.row.jobTitle,
        country: p.row.country,
        currency: p.row.currency || c?.currency || "USD",
        baseSalary: Number(p.row.baseSalary),
        bonusPct: Number(p.row.bonusPct || 0),
        effectiveDate: p.row.effectiveDate || new Date().toISOString().slice(0, 10),
        employmentType: (p.row.employmentType as Employee["employmentType"]) || "Full-time",
        status: "Active",
      };
      addEmployee(emp);
    });
    const skipped = (parsed || []).length - valid.length;
    toast.success(`${valid.length} imported, ${skipped} skipped`);
    setParsed(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setParsed(null); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file. Rows with errors will be skipped.{" "}
            <button onClick={downloadSampleCsv} className="text-primary inline-flex items-center gap-1 hover:underline">
              <Download className="h-3 w-3" /> Download sample template
            </button>
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
            <input type="file" accept=".csv" id="csv-up" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <label htmlFor="csv-up" className="cursor-pointer">
              <p className="text-sm font-medium">Click to upload CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Expected columns: name, department, jobTitle, country, currency, baseSalary, bonusPct, employmentType, effectiveDate</p>
            </label>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto border border-border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left w-8"></th>
                  {headers.map((h) => <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className={`border-t border-border ${p.valid ? "bg-[color:var(--status-active)]/5" : "bg-destructive/5"}`}>
                    <td className="px-2 py-2">{p.valid ? <CheckCircle2 className="h-4 w-4 text-[color:var(--status-active)]" /> : <XCircle className="h-4 w-4 text-destructive" />}</td>
                    {headers.map((h) => <td key={h} className="px-2 py-2">{p.row[h]}</td>)}
                    {!p.valid && <td className="px-2 py-2 text-destructive">{p.error}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          {parsed && (
            <>
              <Button variant="outline" onClick={() => setParsed(null)}>Re-upload</Button>
              <Button onClick={confirm}>
                Import {parsed.filter((p) => p.valid).length} rows
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function validate(r: Record<string, string>): string | undefined {
  if (!r.name) return "Name required";
  if (!DEPARTMENTS.includes(r.department)) return `Invalid department`;
  if (!JOB_TITLES.includes(r.jobTitle)) return `Invalid job title`;
  if (!COUNTRIES.find((c) => c.name === r.country)) return `Invalid country`;
  const s = Number(r.baseSalary);
  if (!s || isNaN(s) || s <= 0) return `Invalid salary`;
  if (r.employmentType && !["Full-time", "Part-time", "Contractor"].includes(r.employmentType)) return `Invalid employment type`;
  return undefined;
}
