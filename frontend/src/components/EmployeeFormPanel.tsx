import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/lib/store";
import { type Employee } from "@/lib/types";
import { toast } from "sonner";

export function EmployeeFormPanel({
  open, onOpenChange, employee,
}: { open: boolean; onOpenChange: (v: boolean) => void; employee?: Employee }) {
  const { addEmployee, updateEmployee, refDepts, refCountries, refJobTitles, refCurrencies } = useStore();
  const isEdit = !!employee;
  const [form, setForm] = useState<Employee>(() => employee || blank());

  useEffect(() => { setForm(employee || blank()); }, [employee, open]);

  function set<K extends keyof Employee>(k: K, v: Employee[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSave() {
    if (!form.name || !form.department || !form.jobTitle || !form.country || !form.baseSalary) {
      toast.error("Please fill all required fields.");
      return;
    }
    try {
      if (isEdit) {
        if (!form.hrNote || form.hrNote.trim().length === 0) {
          toast.error("HR Note is required when editing an existing record.");
          return;
        }
        await updateEmployee(employee!.id, form, form.hrNote);
        toast.success("Employee updated.");
      } else {
        await addEmployee(form);
        toast.success("Employee added.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save employee.");
    }
  }

  // Dynamic Options lists
  const deptOptions = refDepts.map((d) => d.name);
  const selectedDeptId = refDepts.find((d) => d.name === form.department)?.id;
  const filteredJobTitles = selectedDeptId
    ? refJobTitles.filter((j) => j.department === selectedDeptId)
    : refJobTitles;
  const jobTitleOptions = filteredJobTitles.map((j) => j.title);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Employee" : "Add Employee"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Salary changes will be appended to the employee's history." : "Create a new employee record."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6 px-4 pb-6">
          <Row label="Employee ID">
            <Input value={form.id} onChange={(e) => set("id", e.target.value)} placeholder="EMP-1234" />
          </Row>
          <Row label="Full Name *">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Department *">
              <SelectField
                value={form.department}
                onChange={(v) => {
                  setForm((p) => ({ ...p, department: v, jobTitle: "" }));
                }}
                options={deptOptions}
              />
            </Row>
            <Row label="Job Title *">
              <SelectField value={form.jobTitle} onChange={(v) => set("jobTitle", v)} options={jobTitleOptions} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Country *">
              <Select value={form.country} onValueChange={(v) => {
                const c = refCountries.find((x) => x.name === v);
                setForm((p) => ({
                  ...p,
                  country: v,
                  currency: c ? c.default_currency_code : p.currency,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {refCountries.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Local Currency *">
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {refCurrencies.map((c) => <SelectItem key={c.id} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Base Salary (local) *">
              <Input type="number" value={form.baseSalary || ""} onChange={(e) => set("baseSalary", Number(e.target.value))} />
            </Row>
            <Row label="Bonus Target %">
              <Input type="number" value={form.bonusPct || 0} onChange={(e) => set("bonusPct", Number(e.target.value))} />
            </Row>
          </div>
          <Row label="Effective Date">
            <Input type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
          </Row>
          <Row label="Employment Type">
            <RadioGroup value={form.employmentType} onValueChange={(v) => set("employmentType", v as Employee["employmentType"])} className="flex gap-4">
              {(["Full-time", "Part-time", "Contractor"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value={t} id={`et-${t}`} />
                  <span>{t}</span>
                </label>
              ))}
            </RadioGroup>
          </Row>
          <Row label={isEdit ? "HR Note (required) *" : "HR Note"}>
            <Textarea value={form.hrNote || ""} onChange={(e) => set("hrNote", e.target.value)} placeholder="Reason for change..." />
          </Row>
          <Row label="Status">
            <div className="flex items-center gap-3">
              <Switch checked={form.status === "Active"} onCheckedChange={(v) => set("status", v ? "Active" : "Inactive")} />
              <span className="text-sm text-muted-foreground">{form.status}</span>
            </div>
          </Row>
        </div>

        <div className="border-t border-border px-4 py-4 flex justify-end gap-2 sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? "Save Changes" : "Add Employee"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function blank(): Employee {
  return {
    id: `EMP-${1000 + Math.floor(Math.random() * 9000)}`,
    name: "",
    department: "",
    jobTitle: "",
    country: "",
    currency: "",
    baseSalary: 0,
    bonusPct: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    employmentType: "Full-time",
    status: "Active",
  };
}
