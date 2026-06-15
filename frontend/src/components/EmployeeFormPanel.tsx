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

type FormErrors = Partial<Record<keyof Employee, string>>;

export function EmployeeFormPanel({
  open, onOpenChange, employee,
}: { open: boolean; onOpenChange: (v: boolean) => void; employee?: Employee }) {
  const { addEmployee, updateEmployee, refDepts, refCountries, refJobTitles, refCurrencies } = useStore();
  const isEdit = !!employee;
  const [form, setForm] = useState<Employee>(() => employee || blank());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(employee || blank());
    setErrors({});
    setIsSaving(false);
  }, [employee, open]);

  function set<K extends keyof Employee>(k: K, v: Employee[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    // Clear the error for this field when user updates it
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.name || form.name.trim().length === 0) {
      errs.name = "Full Name is required.";
    }
    if (!form.department) {
      errs.department = "Department is required.";
    }
    if (!form.jobTitle) {
      errs.jobTitle = "Job Title is required.";
    }
    if (!form.country) {
      errs.country = "Country is required.";
    }
    if (!form.currency) {
      errs.currency = "Currency is required.";
    }
    if (!form.baseSalary || form.baseSalary <= 0) {
      errs.baseSalary = "Base Salary must be greater than 0.";
    }
    if (!form.effectiveDate) {
      errs.effectiveDate = "Effective Date is required.";
    }
    if (isEdit && (!form.hrNote || form.hrNote.trim().length === 0)) {
      errs.hrNote = "HR Note is required when editing an existing record.";
    }
    return errs;
  }

  async function handleSave() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted errors.");
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        await updateEmployee(employee!.id, form, form.hrNote!);
        toast.success("Employee updated.");
      } else {
        await addEmployee(form);
        toast.success("Employee added.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save employee.");
    } finally {
      setIsSaving(false);
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
          <Row label="Full Name *" error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Department *" error={errors.department}>
              <SelectField
                value={form.department}
                onChange={(v) => {
                  setForm((p) => ({ ...p, department: v, jobTitle: "" }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.department;
                    return next;
                  });
                }}
                options={deptOptions}
                hasError={!!errors.department}
              />
            </Row>
            <Row label="Job Title *" error={errors.jobTitle}>
              <SelectField
                value={form.jobTitle}
                onChange={(v) => set("jobTitle", v)}
                options={jobTitleOptions}
                hasError={!!errors.jobTitle}
              />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Country *" error={errors.country}>
              <Select value={form.country} onValueChange={(v) => {
                const c = refCountries.find((x) => x.name === v);
                setForm((p) => ({
                  ...p,
                  country: v,
                  currency: c ? c.default_currency_code : p.currency,
                }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.country;
                  return next;
                });
              }}>
                <SelectTrigger className={errors.country ? "border-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {refCountries.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Local Currency *" error={errors.currency}>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger className={errors.currency ? "border-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {refCurrencies.map((c) => <SelectItem key={c.id} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Base Salary (local) *" error={errors.baseSalary}>
              <Input
                type="number"
                value={form.baseSalary || ""}
                onChange={(e) => set("baseSalary", Number(e.target.value))}
                className={errors.baseSalary ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
            </Row>
            <Row label="Bonus Target %">
              <Input type="number" value={form.bonusPct || 0} onChange={(e) => set("bonusPct", Number(e.target.value))} />
            </Row>
          </div>
          <Row label="Effective Date *" error={errors.effectiveDate}>
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => set("effectiveDate", e.target.value)}
              className={errors.effectiveDate ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
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
          <Row label={isEdit ? "HR Note (required) *" : "HR Note"} error={errors.hrNote}>
            <Textarea
              value={form.hrNote || ""}
              onChange={(e) => set("hrNote", e.target.value)}
              placeholder="Reason for change..."
              className={errors.hrNote ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </Row>
          <Row label="Status">
            <div className="flex items-center gap-3">
              <Switch checked={form.status === "Active"} onCheckedChange={(v) => set("status", v ? "Active" : "Inactive")} />
              <span className="text-sm text-muted-foreground">{form.status}</span>
            </div>
          </Row>
        </div>

        <div className="border-t border-border px-4 py-4 flex justify-end gap-2 sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Spinner />
                {isEdit ? "Saving..." : "Adding..."}
              </span>
            ) : (
              isEdit ? "Save Changes" : "Add Employee"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function SelectField({ value, onChange, options, hasError }: { value: string; onChange: (v: string) => void; options: string[]; hasError?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={hasError ? "border-red-500 focus:ring-red-500" : ""}>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
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
    createdAt: "",
  };
}
