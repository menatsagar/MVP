import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, XCircle, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadSampleCsv } from "@/lib/csv";

type ImportStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

interface ImportResult {
  rows_imported: number;
  rows_failed: number;
  errors: { row: number; errors: string[] }[];
  error?: string;
}

export function ImportCsvDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const resetState = useCallback(() => {
    setFile(null);
    setImportStatus("idle");
    setResult(null);
    setTaskId(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  function handleClose(v: boolean) {
    if (!v) resetState();
    onOpenChange(v);
  }

  function handleFileSelect(selectedFile: File) {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx"].includes(ext)) {
      toast.error("Please select a .csv or .xlsx file.");
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setImportStatus("idle");
  }

  function getAuthToken(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  }

  async function pollTaskStatus(id: string) {
    const token = getAuthToken();
    try {
      const res = await fetch(`http://localhost:8000/api/employees/import/${id}/status/`, {
        headers: token ? { Authorization: `Token ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "completed") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setImportStatus("completed");
        setResult(data.result_data);
        const imported = data.result_data?.rows_imported || 0;
        const failed = data.result_data?.rows_failed || 0;
        toast.success(`Import complete: ${imported} imported, ${failed} failed.`);

        // Trigger a page reload to refresh data after short delay
        setTimeout(() => window.location.reload(), 1500);
      } else if (data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setImportStatus("failed");
        setResult(data.result_data);
        toast.error(data.result_data?.error || "Import failed.");
      }
      // "pending" / "processing" → keep polling
    } catch {
      // Network error — keep polling
    }
  }

  async function handleUpload() {
    if (!file) return;

    setImportStatus("uploading");
    const token = getAuthToken();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/employees/import/", {
        method: "POST",
        headers: token ? { Authorization: `Token ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setTaskId(data.task_id);
      setImportStatus("processing");

      // Start polling
      pollRef.current = setInterval(() => pollTaskStatus(data.task_id), 1500);
    } catch (err: any) {
      setImportStatus("failed");
      setResult({ rows_imported: 0, rows_failed: 0, errors: [], error: err.message });
      toast.error(err.message || "Failed to upload file.");
    }
  }

  const isProcessing = importStatus === "uploading" || importStatus === "processing";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Employees</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel (.xlsx) file to bulk import employees.{" "}
            <button onClick={downloadSampleCsv} className="text-primary inline-flex items-center gap-1 hover:underline">
              <Download className="h-3 w-3" /> Download sample CSV template
            </button>
          </DialogDescription>
        </DialogHeader>

        {/* File Selection */}
        {importStatus === "idle" && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) handleFileSelect(droppedFile);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              id="import-file-upload"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <label htmlFor="import-file-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports <strong>.csv</strong> and <strong>.xlsx</strong> files
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Required columns: full_name, department, job_title, country, base_salary, effective_date, employment_type
              </p>
            </label>
          </div>
        )}

        {/* File Selected — Ready to Upload */}
        {file && importStatus === "idle" && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
            <FileSpreadsheet className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
              Remove
            </Button>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {importStatus === "uploading" ? "Uploading file..." : "Processing import..."}
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a moment for large files.
            </p>
          </div>
        )}

        {/* Results */}
        {(importStatus === "completed" || importStatus === "failed") && result && (
          <div className="space-y-4">
            {/* Summary */}
            {result.error && !result.rows_imported && !result.rows_failed ? (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-green-500/5">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-green-600">{result.rows_imported}</p>
                    <p className="text-xs text-muted-foreground">Rows imported</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-red-500/5">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-red-500">{result.rows_failed}</p>
                    <p className="text-xs text-muted-foreground">Rows failed</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details */}
            {result.errors && result.errors.length > 0 && (
              <div className="max-h-[250px] overflow-auto border border-border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t border-border bg-destructive/5">
                        <td className="px-3 py-2 font-mono">{e.row}</td>
                        <td className="px-3 py-2 text-destructive">
                          {e.errors.map((err, j) => (
                            <div key={j}>{err}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {importStatus === "idle" && file && (
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-1.5" />
              Upload & Import
            </Button>
          )}
          {(importStatus === "completed" || importStatus === "failed") && (
            <>
              <Button variant="outline" onClick={resetState}>Import Another</Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </>
          )}
          {isProcessing && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Processing...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
