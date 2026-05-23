"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createTeacherFormFieldRequest,
  createTeacherFormSectionRequest,
  deleteTeacherFormFieldRequest,
  deleteTeacherFormSectionRequest,
  getTeacherFormRequest,
  updateTeacherFormFieldRequest,
  updateTeacherFormSectionRequest,
} from "@/lib/teacher-form-api";
import { useAuthStore } from "@/store/auth-store";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormFieldType,
  ApiTeacherFormSection,
} from "@/types/teacher-form-api";

const FIELD_TYPES: { value: ApiTeacherFormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes / No" },
  { value: "work_experience", label: "Work experience block" },
];

function slugifyKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function TeacherFormManager() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [config, setConfig] = useState<ApiTeacherFormConfig>({ sections: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [sectionDialog, setSectionDialog] = useState<
    "add" | { edit: ApiTeacherFormSection } | null
  >(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");

  const [fieldDialog, setFieldDialog] = useState<
    | { mode: "add"; sectionId: string }
    | { mode: "edit"; sectionId: string; fieldKey: string }
    | null
  >(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<ApiTeacherFormFieldType>("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState("");

  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteFieldKey, setDeleteFieldKey] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setConfig({ sections: [] });
      return;
    }
    setLoading(true);
    const result = await getTeacherFormRequest(accessToken);
    setLoading(false);
    if (!result.ok) {
      toast.error("Could not load form", { description: result.message });
      return;
    }
    setConfig(result.data);
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveSection = async () => {
    if (!accessToken || !sectionDialog) return;
    setBusy(true);
    if (sectionDialog === "add") {
      const result = await createTeacherFormSectionRequest(accessToken, {
        title: sectionTitle.trim() || "New section",
        description: sectionDescription.trim() || undefined,
      });
      setBusy(false);
      if (!result.ok) {
        toast.error("Could not add section", { description: result.message });
        return;
      }
      toast.success("Section added");
    } else {
      const result = await updateTeacherFormSectionRequest(
        accessToken,
        sectionDialog.edit.id,
        {
          title: sectionTitle.trim(),
          description: sectionDescription.trim() || null,
        }
      );
      setBusy(false);
      if (!result.ok) {
        toast.error("Could not update section", { description: result.message });
        return;
      }
      toast.success("Section updated");
    }
    setSectionDialog(null);
    void reload();
  };

  const saveField = async () => {
    if (!accessToken || !fieldDialog) return;
    const label = fieldLabel.trim();
    if (!label) {
      toast.error("Enter a field label");
      return;
    }
    const options = fieldOptions
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    if (fieldDialog.mode === "add") {
      const key = fieldKey.trim() || slugifyKey(label);
      const result = await createTeacherFormFieldRequest(
        accessToken,
        fieldDialog.sectionId,
        {
          label,
          key,
          type: fieldType,
          required: fieldRequired,
          options: options.length ? options : undefined,
        }
      );
      setBusy(false);
      if (!result.ok) {
        toast.error("Could not add field", { description: result.message });
        return;
      }
      toast.success("Field added");
    } else {
      const result = await updateTeacherFormFieldRequest(
        accessToken,
        fieldDialog.fieldKey,
        {
          label,
          type: fieldType,
          required: fieldRequired,
          options,
        }
      );
      setBusy(false);
      if (!result.ok) {
        toast.error("Could not update field", { description: result.message });
        return;
      }
      toast.success("Field updated");
    }
    setFieldDialog(null);
    void reload();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading form from API…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher form builder"
      >
        <Button
          onClick={() => {
            setSectionTitle("");
            setSectionDescription("");
            setSectionDialog("add");
          }}
          disabled={busy || !accessToken}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add section
        </Button>
      </PageHeader>

      {!accessToken ? (
        <p className="text-sm text-destructive">Sign in to manage the form layout.</p>
      ) : null}

      <div className="space-y-4">
        {config.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">{section.title}</CardTitle>
                {section.description ? (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSectionTitle(section.title);
                    setSectionDescription(section.description ?? "");
                    setSectionDialog({ edit: section });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {section.deletable !== false && !section.system ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteSectionId(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y rounded-md border">
                {section.fields.map((field) => (
                  <li
                    key={field.key}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <div>
                      <p className="font-medium">{field.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {field.options?.length ? (
                        <Badge variant="outline">{field.options.length} options</Badge>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFieldDialog({
                            mode: "edit",
                            sectionId: section.id,
                            fieldKey: field.key,
                          });
                          setFieldLabel(field.label);
                          setFieldKey(field.key);
                          setFieldType(field.type);
                          setFieldRequired(!!field.required);
                          setFieldOptions((field.options ?? []).join(", "));
                        }}
                      >
                        Edit
                      </Button>
                      {field.deletable !== false && field.key !== "name" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteFieldKey(field.key)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFieldDialog({ mode: "add", sectionId: section.id });
                  setFieldLabel("");
                  setFieldKey("");
                  setFieldType("text");
                  setFieldRequired(false);
                  setFieldOptions("");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add field
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={sectionDialog !== null} onOpenChange={(o) => !o && setSectionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sectionDialog === "add" ? "Add section" : "Edit section"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSection()} disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldDialog !== null} onOpenChange={(o) => !o && setFieldDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fieldDialog?.mode === "add" ? "Add field" : "Edit field"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={fieldLabel}
                onChange={(e) => {
                  setFieldLabel(e.target.value);
                  if (fieldDialog?.mode === "add") {
                    setFieldKey(slugifyKey(e.target.value));
                  }
                }}
              />
            </div>
            {fieldDialog?.mode === "add" ? (
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={fieldType}
                onValueChange={(v) => setFieldType(v as ApiTeacherFormFieldType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Textarea
                  rows={3}
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch checked={fieldRequired} onCheckedChange={setFieldRequired} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveField()} disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteSectionId !== null}
        onOpenChange={(o) => !o && setDeleteSectionId(null)}
        title="Delete section?"
        description="Removes this section and its fields from the teacher form."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!accessToken || !deleteSectionId) return;
          setBusy(true);
          const result = await deleteTeacherFormSectionRequest(
            accessToken,
            deleteSectionId
          );
          setBusy(false);
          setDeleteSectionId(null);
          if (!result.ok) {
            toast.error("Could not delete section", { description: result.message });
            return;
          }
          toast.success("Section removed");
          void reload();
        }}
      />

      <ConfirmDialog
        open={deleteFieldKey !== null}
        onOpenChange={(o) => !o && setDeleteFieldKey(null)}
        title="Delete field?"
        description="Removes this field from the teacher form."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!accessToken || !deleteFieldKey) return;
          setBusy(true);
          const result = await deleteTeacherFormFieldRequest(
            accessToken,
            deleteFieldKey
          );
          setBusy(false);
          setDeleteFieldKey(null);
          if (!result.ok) {
            toast.error("Could not delete field", { description: result.message });
            return;
          }
          toast.success("Field removed");
          void reload();
        }}
      />
    </div>
  );
}
