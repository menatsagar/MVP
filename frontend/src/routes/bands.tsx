import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, Plus, Trash2, Edit3 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, JOB_TITLES, type SalaryBand } from "@/lib/types";
import { formatLocal } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/bands")({
  head: () => ({ meta: [{ title: "Salary Bands — ACME Salary" }] }),
  component: BandsPage,
});

function BandsPage() {
  const { bands, addBand, updateBand, deleteBand } = useStore();
  const [editing, setEditing] = useState<SalaryBand | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Salary Bands"
        subtitle="Define minimum, midpoint, and maximum compensation per role and country."
        actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-1.5" /> Add Band</Button>}
      />

      {bands.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No salary bands yet"
          description="Start by defining your first band for a job title and country."
          action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-1.5" /> Add Band</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Min</th>
                <th className="px-4 py-3 text-right">Midpoint</th>
                <th className="px-4 py-3 text-right">Max</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{b.jobTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.country}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.currency}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatLocal(b.min, b.currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatLocal(b.mid, b.currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatLocal(b.max, b.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(b)}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <BandFormDialog
          band={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(b) => {
            if (editing === "new") { addBand(b); toast.success("Band added."); }
            else { updateBand((editing as SalaryBand).id, b); toast.success("Band updated."); }
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this band?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDelete) { deleteBand(confirmDelete); toast.success("Band deleted."); setConfirmDelete(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BandFormDialog({ band, onClose, onSave }: { band?: SalaryBand; onClose: () => void; onSave: (b: Omit<SalaryBand, "id">) => void }) {
  const [f, setF] = useState<Omit<SalaryBand, "id">>(band || {
    jobTitle: JOB_TITLES[0], country: COUNTRIES[0].name, currency: COUNTRIES[0].currency, min: 0, mid: 0, max: 0,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{band ? "Edit Band" : "Add Salary Band"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Job Title</Label>
            <Select value={f.jobTitle} onValueChange={(v) => setF({ ...f, jobTitle: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{JOB_TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Country</Label>
              <Select value={f.country} onValueChange={(v) => {
                const c = COUNTRIES.find((x) => x.name === v);
                setF({ ...f, country: v, currency: c?.currency || f.currency });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Min</Label><Input type="number" value={f.min || ""} onChange={(e) => setF({ ...f, min: Number(e.target.value) })} /></div>
            <div><Label>Midpoint</Label><Input type="number" value={f.mid || ""} onChange={(e) => setF({ ...f, mid: Number(e.target.value) })} /></div>
            <div><Label>Max</Label><Input type="number" value={f.max || ""} onChange={(e) => setF({ ...f, max: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(f)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
