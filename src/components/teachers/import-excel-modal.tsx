"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildSampleTemplateWorkbook } from "@/utils/export-teachers";
import { rowToTeacher, type ParsedRow } from "@/utils/parse-imported-rows";
import { TEACHER_EXCEL_HEADERS } from "@/utils/teacher-excel-columns";
import { importTeachersFileRequest } from "@/lib/teachers-api";
import { fetchTeacherFormOptions } from "@/lib/teacher-form-options";
import { useAuthStore } from "@/store/auth-store";
import type { Teacher } from "@/types/teacher";
import { cn } from "@/lib/utils";

interface ImportExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  /** Called after POST /api/teachers/import succeeds. */
  onAfterApiImport?: () => void;
}

function formatColumnLabel(header: string): string {
  return header
    .split(" ")
    .map((w) =>
      w.length <= 3 && w === w.toUpperCase()
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

export function ImportExcelModal({
  open,
  onOpenChange,
  teachers,
  onAfterApiImport,
}: ImportExcelModalProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows([]);
    setSelectedFile(null);
    setProgress(0);
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stats = useMemo(() => {
    const ready = rows.filter((r) => !r.errors.length).length;
    const errors = rows.length - ready;
    return { ready, errors, total: rows.length };
  }, [rows]);

  const parseFile = useCallback(
    (file: File) => {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
          if (!sheet) {
            toast.error("No worksheet found");
            return;
          }
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
          const parsed: ParsedRow[] = [];
          let rolling: Teacher[] = [...teachers];
          json.forEach((raw, idx) => {
            const res = rowToTeacher(raw, rolling, idx + 2);
            parsed.push(res);
            if (res.teacher) {
              rolling = [res.teacher, ...rolling];
            }
          });
          setRows(parsed);
          const errCount = parsed.filter((r) => r.errors.length).length;
          if (errCount) {
            toast.message("Some rows need fixes", {
              description: `${errCount} of ${parsed.length} row(s) failed validation.`,
            });
          } else if (parsed.length) {
            toast.success("File ready", {
              description: `${parsed.length} row(s) passed validation.`,
            });
          }
        } catch {
          toast.error("Could not read this file");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [teachers]
  );

  const onFileChange = (file: File | undefined) => {
    if (file) parseFile(file);
  };

  const downloadTemplate = async () => {
    try {
      const options = await fetchTeacherFormOptions(accessToken);
      const book = buildSampleTemplateWorkbook(options);
      XLSX.writeFile(book, "teacher-import-template.xlsx");
      toast.success("Template downloaded");
    } catch {
      const book = buildSampleTemplateWorkbook();
      XLSX.writeFile(book, "teacher-import-template.xlsx");
      toast.success("Template downloaded");
    }
  };

  const runImport = async () => {
    if (accessToken) {
      if (!selectedFile) {
        toast.error("Choose a spreadsheet first");
        return;
      }
      setBusy(true);
      setProgress(20);
      const result = await importTeachersFileRequest(
        accessToken,
        selectedFile
      );
      setProgress(100);
      setBusy(false);
      if (!result.ok) {
        setProgress(0);
        toast.error("Import failed", { description: result.message });
        return;
      }
      toast.success("Import complete", { description: result.message });
      onAfterApiImport?.();
      reset();
      onOpenChange(false);
      return;
    }

    toast.error("Sign in required", {
      description:
        "Log in so your Excel file can be uploaded to POST /api/teachers/import.",
    });
  };

  const importDisabled = busy || !accessToken || !selectedFile;

  const hasPreview = rows.length > 0 || selectedFile;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,820px)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-5">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Import teachers
          </DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Download the template, fill one row per teacher, then upload your
            file.{" "}
            {accessToken
              ? "Confirming import sends the file to the server (POST /api/teachers/import)."
              : "Sign in to upload the file to the server."}
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/25 p-4">
              <p className="text-sm font-medium text-foreground">1. Template</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Matches your Excel layout — {TEACHER_EXCEL_HEADERS.length}{" "}
                columns in the correct order.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                onClick={downloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download template
              </Button>
            </div>

            <div
              className={cn(
                "rounded-xl border border-dashed p-4 transition-colors",
                selectedFile
                  ? "border-primary/40 bg-primary/5"
                  : "bg-muted/15 hover:border-muted-foreground/30"
              )}
            >
              <p className="text-sm font-medium text-foreground">2. Upload</p>
              <p className="mt-1 text-xs text-muted-foreground">
                .xlsx or .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => onFileChange(e.target.files?.[0])}
              />
              {selectedFile ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {selectedFile.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Remove file"
                    onClick={() => {
                      reset();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose file
                </Button>
              )}
              {selectedFile && !accessToken ? (
                <Button
                  type="button"
                  variant="link"
                  className="mt-1 h-auto px-0 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace file
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Required columns
              </p>
            </div>
            <ScrollArea className="h-[88px]">
              <div className="flex flex-wrap gap-1.5 p-3">
                {TEACHER_EXCEL_HEADERS.map((h) => (
                  <span
                    key={h}
                    className="inline-flex rounded-md bg-muted/60 px-2 py-0.5 text-xs text-foreground"
                  >
                    {formatColumnLabel(h)}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </div>

          {busy ? (
            <div className="space-y-2">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">Importing…</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Preview</p>
              {hasPreview && !accessToken && stats.total > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {stats.total} row{stats.total === 1 ? "" : "s"}
                  </Badge>
                  {stats.ready > 0 ? (
                    <Badge className="gap-1 font-normal">
                      <CheckCircle2 className="h-3 w-3" />
                      {stats.ready} ready
                    </Badge>
                  ) : null}
                  {stats.errors > 0 ? (
                    <Badge variant="destructive" className="gap-1 font-normal">
                      <AlertCircle className="h-3 w-3" />
                      {stats.errors} need fixes
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border">
              {!hasPreview ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    No file yet
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Upload a spreadsheet to see a row-by-row preview before
                    import.
                  </p>
                </div>
              ) : accessToken && selectedFile && rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">File selected</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Click Import to upload this file to the server. Preview is
                    optional for signed-in imports.
                  </p>
                </div>
              ) : (
                <div className="max-h-[240px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="h-9 w-12">#</TableHead>
                        <TableHead className="h-9">Contact</TableHead>
                        <TableHead className="h-9">Name</TableHead>
                        <TableHead className="h-9">Email</TableHead>
                        <TableHead className="h-9 w-28 text-right">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.rowIndex}>
                          <TableCell className="text-muted-foreground">
                            {r.rowIndex}
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate text-sm">
                            {r.normalized.contactId || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.normalized.name || "—"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm">
                            {r.normalized.email || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.errors.length ? (
                              <Badge
                                variant="outline"
                                className="max-w-[120px] truncate border-destructive/30 font-normal text-destructive"
                                title={r.errors.join(", ")}
                              >
                                Error
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-primary/25 font-normal text-primary"
                              >
                                Ready
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={importDisabled}
            onClick={runImport}
          >
            {busy
              ? "Uploading…"
              : accessToken
                ? "Import to server"
                : "Sign in to import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
