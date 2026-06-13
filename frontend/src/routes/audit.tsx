import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { download, toCsv } from "@/lib/csv";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit Log — ACME Salary" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { audit } = useStore();
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return audit.filter((a) => {
      if (action !== "all" && a.action !== action) return false;
      if (entity !== "all" && a.entityType !== entity) return false;
      const d = a.timestamp.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [audit, action, entity, from, to]);

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Timestamp", "Action", "Entity Type", "Entity", "Field", "Old Value", "New Value", "User"],
      ...filtered.map((a) => [a.timestamp, a.action, a.entityType, a.entityName, a.field || "", a.oldValue || "", a.newValue || "", a.user]),
    ];
    download("audit-log.csv", toCsv(rows));
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Audit Log"
        subtitle="Read-only record of all changes."
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="Create">Create</SelectItem>
            <SelectItem value="Edit">Edit</SelectItem>
            <SelectItem value="Deactivate">Deactivate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="Employee">Employee</SelectItem>
            <SelectItem value="Band">Band</SelectItem>
            <SelectItem value="Review Cycle">Review Cycle</SelectItem>
            <SelectItem value="Exchange Rate">Exchange Rate</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" placeholder="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" placeholder="To" />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left text-xs uppercase text-muted-foreground font-medium">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity Type</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Old</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">User</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(a.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3">{a.action}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.entityType}</td>
                <td className="px-4 py-3 font-medium">{a.entityName}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.field || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.oldValue || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.newValue || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
