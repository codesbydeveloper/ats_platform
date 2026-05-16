"use client";

import { useRef, useState } from "react";
import { FileText, Upload, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isAllowed(file: File) {
  const okMime =
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const ext = file.name.split(".").pop()?.toLowerCase();
  const okExt = ext === "pdf" || ext === "doc" || ext === "docx";
  return okMime || okExt;
}

interface ResumeUploadProps {
  fileName: string | null;
  mime: string | null;
  onChange: (next: { fileName: string | null; mime: string | null }) => void;
  disabled?: boolean;
}

export function ResumeUpload({
  fileName,
  mime,
  onChange,
  disabled,
}: ResumeUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const releasePreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  };

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!isAllowed(file)) {
      setError("Only PDF, DOC, or DOCX files are allowed.");
      return;
    }
    releasePreview();
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
    onChange({
      fileName: file.name,
      mime: file.type || "application/octet-stream",
    });
  };

  const clear = () => {
    releasePreview();
    onChange({ fileName: null, mime: null });
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-10 text-center transition-colors",
          !disabled && "hover:border-primary/40 hover:bg-muted/50",
          disabled && "opacity-60"
        )}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drag & drop resume</p>
        <p className="text-xs text-muted-foreground">
          PDF, DOC, or DOCX · preview for PDF only
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={disabled}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ACCEPT;
            input.onchange = () => handleFile(input.files?.[0]);
            input.click();
          }}
        >
          Browse files
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {fileName ? (
        <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate font-medium">{fileName}</span>
            {mime ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {mime}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={disabled}
            onClick={clear}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      {previewUrl && mime === "application/pdf" ? (
        <div className="overflow-hidden rounded-lg border bg-muted/40">
          <iframe
            title="Resume preview"
            src={previewUrl}
            className="h-64 w-full bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}

interface ResumeQuickUploadProps {
  fileName: string | null;
  onChange: (next: { fileName: string | null; mime: string | null }) => void;
  /** Raw file for API uploads (local-only roster does not need it). */
  onFileSelected?: (file: File | null) => void;
  disabled?: boolean;
}

/** Compact resume picker for headers / toolbars (same rules as ResumeUpload). */
export function ResumeQuickUpload({
  fileName,
  onChange,
  onFileSelected,
  disabled,
}: ResumeQuickUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Upload resume</span>
          <span className="sm:hidden">Resume</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPT}
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!isAllowed(file)) {
              toast.error("Invalid file", {
                description: "Use PDF, DOC, or DOCX only.",
              });
              return;
            }
            onChange({
              fileName: file.name,
              mime: file.type || "application/octet-stream",
            });
            onFileSelected?.(file);
            toast.success("Resume attached", { description: file.name });
          }}
        />
        {fileName ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={disabled}
            aria-label="Remove resume"
            onClick={() => {
              onChange({ fileName: null, mime: null });
              onFileSelected?.(null);
              toast.message("Resume removed");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {fileName ? (
        <p
          className="max-w-[220px] truncate text-left text-xs text-muted-foreground sm:text-right"
          title={fileName}
        >
          {fileName}
        </p>
      ) : null}
    </div>
  );
}
