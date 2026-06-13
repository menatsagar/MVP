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
import { COUNTRIES, DEPARTMENTS, JOB_TITLES, type Employee } from "@/lib/types";
import { toast } from "sonner";

export function EmployeeFormPanel({
  open, onOpenChange, employee,
}: { open: boolean; onOpenChange: (v: boolean) => void; employee?: Employee }) {
  const { addEmployee, updateEmployee } = useStore();
  const isEdit = !!employee;
  const [form, setForm] = useState<Employee>(() => employee || blank());

  useEffect(() => { setForm(employee || blank()); }, [employee, open]);

  function set<K extends keyof Employee>(k: K, v: Employee[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSave() {
    if (!form.name || !form.department || !form.jobTitle || !form.country || !form.baseSalary) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (isEdit) {
      if (!form.hrNote || form.hrNote.trim().length === 0) {
        toast.error("HR Note is required when editing an existing record.");
        return;
      }
      updateEmployee(employee!.id, form, form.hrNote);
      toast.success("Employee updated.");
    } else {
      addEmployee(form);
      toast.success("Employee added.");
    }
    onOpenChange(false);
  }

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
              <SelectField value={form.department} onChange={(v) => set("department", v)} options={DEPARTMENTS} />
            </Row>
            <Row label="Job Title *">
              <SelectField value={form.jobTitle} onChange={(v) => set("jobTitle", v)} options={JOB_TITLES} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Country *">
              <Select value={form.country} onValueChange={(v) => {
                const c = COUNTRIES.find((x) => x.name === v);
                set("country", v);
                if (c) set("currency", c.currency);
              }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Local Currency">
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
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
