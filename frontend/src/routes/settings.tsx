import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — ACME Salary" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { rates, upsertRate, addRate } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Manage exchange rates used for all USD equivalent calculations."
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Currency</Button>}
      />

      <div className="rounded-md border border-border bg-accent/40 px-4 py-3 mb-6 text-sm text-accent-foreground">
        These rates are applied to all USD equivalent calculations across the app. Update them periodically to reflect current budgeting rates.
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left text-xs uppercase text-muted-foreground font-medium">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Currency Name</th>
              <th className="px-4 py-3 text-right">Rate to USD (local per 1 USD)</th>
              <th className="px-4 py-3">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.code} className="border-t border-border">
                <td className="px-4 py-3 font-mono font-medium">{r.code}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.name}</td>
                <td className="px-4 py-3 text-right">
                  <Input
                    type="number"
                    step="0.0001"
                    className="w-32 ml-auto text-right"
                    defaultValue={r.rateToUsd}
                    onChange={(e) => setDraft((p) => ({ ...p, [r.code]: e.target.value }))}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== r.rateToUsd) {
                        upsertRate({ ...r, rateToUsd: v });
                        toast.success(`Updated ${r.code} rate.`);
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">{new Date(r.lastUpdated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddCurrencyDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={(r) => {
        addRate(r);
        toast.success(`Added ${r.code}.`);
        setAddOpen(false);
      }} />
    </div>
  );
}

function AddCurrencyDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (r: { code: string; name: string; rateToUsd: number; lastUpdated: string }) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState(1);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Currency</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Code (3-letter)</Label><Input maxLength={3} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
          <div><Label>Currency Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Rate to USD</Label><Input type="number" step="0.0001" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (code.length !== 3 || !name || rate <= 0) { toast.error("All fields required."); return; }
            onAdd({ code, name, rateToUsd: rate, lastUpdated: new Date().toISOString() });
          }}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
