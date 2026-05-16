"use client";

import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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
import { importTeachersFileRequest } from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth-store";
import type { Teacher } from "@/types/teacher";

interface ImportExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  onImport: (teachers: Teacher[]) => void;
  /** After a successful server-side import (signed-in users). */
  onAfterApiImport?: () => void;
}

export function ImportExcelModal({
  open,
  onOpenChange,
  teachers,
  onImport,
  onAfterApiImport,
}: ImportExcelModalProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows([]);
    setSelectedFile(null);
    setProgress(0);
    setBusy(false);
  };

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
            toast.message("Validation issues detected", {
              description: `${errCount} row(s) need attention before import.`,
            });
          } else {
            toast.success("File parsed", {
              description: "Review the preview, then import.",
            });
          }
        } catch {
          toast.error("Could not parse file");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [teachers]
  );

  const downloadTemplate = () => {
    const book = buildSampleTemplateWorkbook();
    XLSX.writeFile(book, "teacher-import-template.xlsx");
  };

  const runImport = async () => {
    if (accessToken && selectedFile) {
      setBusy(true);
      setProgress(15);
      const result = await importTeachersFileRequest(accessToken, selectedFile);
      setProgress(100);
      setBusy(false);
      if (!result.ok) {
        setProgress(0);
        toast.error("Import failed", { description: result.message });
        return;
      }
      toast.success("Import complete", {
        description: "Your file was sent to the server.",
      });
      onAfterApiImport?.();
      reset();
      onOpenChange(false);
      return;
    }

    const valid = rows
      .map((r) => r.teacher)
      .filter((t): t is Teacher => Boolean(t));
    if (!valid.length) {
      toast.error("No valid rows to import");
      return;
    }
    setBusy(true);
    setProgress(10);
    for (let i = 10; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 80));
      setProgress(i);
    }
    onImport(valid);
    toast.success("Import complete", {
      description: `${valid.length} teacher profile(s) added.`,
    });
    setBusy(false);
    reset();
    onOpenChange(false);
  };

  const importDisabled =
    busy ||
    (accessToken ? !selectedFile : !rows.some((r) => r.teacher));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import teachers
          </DialogTitle>
          <DialogDescription>
            Upload CSV or XLSX. We validate rows, flag duplicates, and let you
            preview before committing.
            {accessToken ? (
              <>
                {" "}
                While signed in, <strong>Import to server</strong> uploads your
                file for bulk import on the API.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Sample template
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
              input.onchange = () => {
                const f = input.files?.[0];
                if (f) parseFile(f);
              };
              input.click();
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload file
          </Button>
        </div>
        {busy ? (
          <div className="space-y-2 py-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">Importing…</p>
          </div>
        ) : null}
        <div className="max-h-[360px] overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Upload a spreadsheet to preview parsed rows.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.rowIndex}>
                    <TableCell>{r.rowIndex}</TableCell>
                    <TableCell>{String(r.raw.name ?? "")}</TableCell>
                    <TableCell>{String(r.raw.email ?? "")}</TableCell>
                    <TableCell>
                      {r.errors.length ? (
                        <span className="text-xs text-destructive">
                          {r.errors.join(" · ")}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">Ready</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={importDisabled}
            onClick={runImport}
          >
            {accessToken ? "Import to server" : "Import valid rows"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
