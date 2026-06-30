"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
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
import { SortableFieldList } from "@/components/form-builder/sortable-field-list";
import {
  createTeacherFormFieldRequest,
  createTeacherFormSectionRequest,
  deleteTeacherFormFieldRequest,
  deleteTeacherFormSectionRequest,
  getTeacherFormRequest,
  reorderTeacherFormFieldsRequest,
  updateTeacherFormFieldRequest,
  updateTeacherFormSectionRequest,
} from "@/lib/teacher-form-api";
import { useAuthStore } from "@/store/auth-store";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
  ApiTeacherFormFieldType,
  ApiTeacherFormSection,
} from "@/types/teacher-form-api";

type LocationPresetType =
  | "countries_states_cities"
  | "countries"
  | "indian_states"
  | "indian_cities";

type WorkRolePresetType = "school_organization_duration_role";

type FieldBundlePresetType = LocationPresetType | WorkRolePresetType;

type FormBuilderFieldType = ApiTeacherFormFieldType | FieldBundlePresetType;

const BUNDLE_PRESET_LABELS: Record<FieldBundlePresetType, string> = {
  countries_states_cities: "Countries, states, cities",
  countries: "Countries",
  indian_states: "Indian States",
  indian_cities: "Indian Cities",
  school_organization_duration_role:
    "School / Organization, Duration From, Duration To, Teacher Role",
};

const WORK_ROLE_PRESET_BASE_KEYS = [
  "school_organization",
  "duration_from",
  "duration_to",
  "teacher_role",
] as const;

const FIELD_TYPES: { value: FormBuilderFieldType; label: string }[] = [
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
  {
    value: "school_organization_duration_role",
    label:
      "School / Organization, Duration From, Duration To, Teacher Role",
  },
  { value: "countries_states_cities", label: "Countries, states, cities" },
  { value: "countries", label: "Countries" },
  { value: "indian_states", label: "Indian States" },
  { value: "indian_cities", label: "Indian Cities" },
];

function isLocationPresetType(v: FormBuilderFieldType): v is LocationPresetType {
  return (
    v === "countries_states_cities" ||
    v === "countries" ||
    v === "indian_states" ||
    v === "indian_cities"
  );
}

function isWorkRolePresetType(v: FormBuilderFieldType): v is WorkRolePresetType {
  return v === "school_organization_duration_role";
}

function isFieldBundlePresetType(
  v: FormBuilderFieldType
): v is FieldBundlePresetType {
  return isLocationPresetType(v) || isWorkRolePresetType(v);
}

function slugifyKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Comma-separated labels → comma-separated slug keys (work-role / location bundles). */
function slugifyKeysFromLabel(label: string): string {
  return label
    .split(/[,;\n]+/)
    .map((part) => slugifyKey(part))
    .filter(Boolean)
    .join(", ");
}

function fieldKeyUsedInForm(
  config: ApiTeacherFormConfig,
  key: string
): boolean {
  return config.sections.some((s) => s.fields.some((f) => f.key === key));
}

function fieldKeyUsedInSection(
  section: ApiTeacherFormSection | undefined,
  key: string
): boolean {
  return section?.fields.some((f) => f.key === key) ?? false;
}

/** Unique API field key — same preset type can repeat when the key differs. */
function allocateFieldKey(
  baseKey: string,
  config: ApiTeacherFormConfig,
  section: ApiTeacherFormSection
): string {
  if (
    !fieldKeyUsedInSection(section, baseKey) &&
    !fieldKeyUsedInForm(config, baseKey)
  ) {
    return baseKey;
  }

  const sectionPart = slugifyKey(section.title) || slugifyKey(section.id) || "section";
  let candidate = `${baseKey}_${sectionPart}`;
  let n = 2;
  while (
    fieldKeyUsedInForm(config, candidate) ||
    fieldKeyUsedInSection(section, candidate)
  ) {
    candidate = `${baseKey}_${sectionPart}_${n}`;
    n++;
  }
  return candidate;
}

type BundleFieldSpec = {
  label: string;
  key: string;
  type: ApiTeacherFormFieldType;
};

function buildWorkRolePresetFields(
  config: ApiTeacherFormConfig,
  section: ApiTeacherFormSection
): BundleFieldSpec[] {
  const spec: { base: string; label: string; type: ApiTeacherFormFieldType }[] =
    [
      {
        base: "school_organization",
        label: "School / Organization",
        type: "text",
      },
      { base: "duration_from", label: "Duration From", type: "date" },
      { base: "duration_to", label: "Duration To", type: "date" },
      { base: "teacher_role", label: "Teacher Role", type: "multiselect" },
    ];

  const out: BundleFieldSpec[] = [];
  for (const item of spec) {
    const key = allocateFieldKey(item.base, config, section);
    out.push({ label: item.label, key, type: item.type });
  }
  return out;
}

function buildFieldBundlePreset(
  presetType: FieldBundlePresetType,
  config: ApiTeacherFormConfig,
  section: ApiTeacherFormSection
): BundleFieldSpec[] {
  if (isWorkRolePresetType(presetType)) {
    return buildWorkRolePresetFields(config, section);
  }
  return buildLocationPresetFields(presetType, config, section);
}

function bundlePresetSuccessMessage(
  presetType: FieldBundlePresetType,
  count: number
): string {
  if (count <= 1) return "Field added";
  if (isWorkRolePresetType(presetType)) return "Work role fields added";
  return "Location fields added";
}

function bundlePresetShowsKeyField(fieldType: FormBuilderFieldType): boolean {
  return isWorkRolePresetType(fieldType) || isLocationPresetType(fieldType);
}

/** Preview API keys for the work-role bundle (editable in the dialog). */
function previewWorkRolePresetKeys(
  config: ApiTeacherFormConfig,
  sectionId: string
): string {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return "";
  const spec = buildWorkRolePresetFields(config, section);
  if (!spec?.length) return "";
  return spec.map((f) => f.key).join(", ");
}

function resolveWorkRoleBundleKeys(
  spec: BundleFieldSpec[],
  keyInput: string,
  config: ApiTeacherFormConfig,
  section: ApiTeacherFormSection
): { ok: true; spec: BundleFieldSpec[] } | { ok: false; message: string } {
  const parsed = keyInput
    .split(/[,;\n]+/)
    .map((part) => slugifyKey(part.trim()) || part.trim())
    .filter(Boolean);

  const keys =
    parsed.length === spec.length
      ? parsed
      : parsed.length === 0
        ? spec.map((item) => item.key)
        : null;

  if (!keys) {
    return {
      ok: false,
      message: `Enter ${spec.length} comma-separated keys (one per field), or leave blank to use the suggested keys.`,
    };
  }

  const seen = new Set<string>();
  for (const key of keys) {
    if (!key) {
      return { ok: false, message: "Each key must be non-empty." };
    }
    if (seen.has(key)) {
      return { ok: false, message: `Duplicate key "${key}" in the list.` };
    }
    seen.add(key);
    if (fieldKeyUsedInSection(section, key)) {
      return {
        ok: false,
        message: `Key "${key}" already exists in this section.`,
      };
    }
    if (fieldKeyUsedInForm(config, key)) {
      return {
        ok: false,
        message: `Key "${key}" is already used in another section.`,
      };
    }
  }

  return {
    ok: true,
    spec: spec.map((item, index) => ({ ...item, key: keys[index]! })),
  };
}

/** Apply comma-separated labels from the dialog (falls back to preset defaults). */
function resolveBundleLabels(
  spec: BundleFieldSpec[],
  labelInput: string
): BundleFieldSpec[] {
  const trimmed = labelInput.trim();
  const parsed = trimmed
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const labels =
    parsed.length === spec.length
      ? parsed
      : parsed.length === 0
        ? spec.map((item) => item.label)
        : spec.length === 1
          ? [trimmed]
          : null;

  if (!labels) return spec;

  return spec.map((item, index) => ({ ...item, label: labels[index]! }));
}

type LocationFieldSpec = BundleFieldSpec;

function buildLocationPresetFields(
  presetType: LocationPresetType,
  config: ApiTeacherFormConfig,
  section: ApiTeacherFormSection
): LocationFieldSpec[] {
  const canonicalAvailable =
    !fieldKeyUsedInForm(config, "country") &&
    !fieldKeyUsedInForm(config, "state") &&
    !fieldKeyUsedInForm(config, "city");

  if (presetType === "countries_states_cities") {
    const countryKey = allocateFieldKey("country", config, section);
    const stateKey = allocateFieldKey("state", config, section);
    const cityKey = allocateFieldKey("city", config, section);

    const useCanonicalTypes =
      canonicalAvailable &&
      countryKey === "country" &&
      stateKey === "state" &&
      cityKey === "city";

    return [
      { label: "Country", key: countryKey, type: "countries" },
      {
        label: "State",
        key: stateKey,
        type: useCanonicalTypes ? "select" : "indian_states",
      },
      {
        label: "City",
        key: cityKey,
        type: useCanonicalTypes ? "select" : "indian_cities",
      },
    ];
  }

  if (presetType === "countries") {
    const countryKey = allocateFieldKey("country", config, section);
    return [{ label: "Country", key: countryKey, type: "countries" }];
  }

  if (presetType === "indian_states") {
    const stateKey = allocateFieldKey("state", config, section);
    const useSelect =
      stateKey === "state" && !fieldKeyUsedInForm(config, "state");
    return [
      {
        label: "State",
        key: stateKey,
        type: useSelect ? "select" : "indian_states",
      },
    ];
  }

  const cityKey = allocateFieldKey("city", config, section);
  const useSelect = cityKey === "city" && !fieldKeyUsedInForm(config, "city");
  return [
    {
      label: "City",
      key: cityKey,
      type: useSelect ? "select" : "indian_cities",
    },
  ];
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
  const [fieldType, setFieldType] = useState<FormBuilderFieldType>("text");
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
    const preset =
      fieldDialog.mode === "add" && isFieldBundlePresetType(fieldType);
    const label = fieldLabel.trim();
    if (!preset && !label) {
      toast.error("Enter a field label");
      return;
    }
    const options = fieldOptions
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    if (fieldDialog.mode === "add") {
      // Bundle presets add multiple built-in fields at once.
      if (preset) {
        const presetType = fieldType;
        const section = config.sections.find((s) => s.id === fieldDialog.sectionId);
        if (!section) {
          setBusy(false);
          toast.error("Section not found");
          return;
        }

        const spec = buildFieldBundlePreset(presetType, config, section);
        if (!spec.length) {
          setBusy(false);
          toast.error("Cannot add field", {
            description: "No fields to add for this preset.",
          });
          return;
        }

        let finalSpec = spec;
        if (isWorkRolePresetType(presetType) || isLocationPresetType(presetType)) {
          const resolved = resolveWorkRoleBundleKeys(
            spec,
            fieldKey,
            config,
            section
          );
          if (!resolved.ok) {
            setBusy(false);
            toast.error("Invalid keys", { description: resolved.message });
            return;
          }
          finalSpec = resolveBundleLabels(resolved.spec, label);
        }

        const maxSort = Math.max(
          0,
          ...section.fields
            .map((f) => (typeof f.sortOrder === "number" ? f.sortOrder : 0))
            .filter((n) => Number.isFinite(n))
        );

        let created = 0;
        for (let i = 0; i < finalSpec.length; i++) {
          const next = finalSpec[i]!;
          const r = await createTeacherFormFieldRequest(
            accessToken,
            fieldDialog.sectionId,
            {
              label: next.label,
              key: next.key,
              type: next.type,
              required: false,
              sortOrder: maxSort + 1 + i,
            }
          );
          if (!r.ok) {
            setBusy(false);
            toast.error("Could not add field", { description: r.message });
            return;
          }
          created++;
        }

        setBusy(false);
        toast.success(bundlePresetSuccessMessage(presetType, created));
      } else {
        const key = fieldKey.trim() || slugifyKey(label);
        const section = config.sections.find((s) => s.id === fieldDialog.sectionId);
        if (section && fieldKeyUsedInSection(section, key)) {
          setBusy(false);
          toast.error("Field already exists", {
            description: "This section already has a field with that key.",
          });
          return;
        }
        const result = await createTeacherFormFieldRequest(
          accessToken,
          fieldDialog.sectionId,
          {
            label,
            key,
            type: fieldType as ApiTeacherFormFieldType,
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
      }
    } else {
      const result = await updateTeacherFormFieldRequest(
        accessToken,
        fieldDialog.fieldKey,
        {
          label,
          type: fieldType as ApiTeacherFormFieldType,
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

  const toggleFieldFilter = async (fieldKey: string, enabled: boolean) => {
    if (!accessToken) return;
    setBusy(true);
    const result = await updateTeacherFormFieldRequest(accessToken, fieldKey, {
      filter: enabled ? 1 : 0,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error("Could not update filter", { description: result.message });
      return;
    }
    toast.success(
      enabled ? "Field added to advanced filters" : "Field removed from filters"
    );
    void reload();
  };

  const openFieldEdit = (field: ApiTeacherFormField, sectionId: string) => {
    setFieldDialog({
      mode: "edit",
      sectionId,
      fieldKey: field.key,
    });
    setFieldLabel(field.label);
    setFieldKey(field.key);
    setFieldType(field.type);
    setFieldRequired(!!field.required);
    setFieldOptions((field.options ?? []).join(", "));
  };

  const reorderFields = async (sectionId: string, orderedKeys: string[]) => {
    if (!accessToken) return;

    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const byKey = new Map(section.fields.map((f) => [f.key, f]));
    const reorderedFields = orderedKeys
      .map((key) => byKey.get(key))
      .filter((f): f is ApiTeacherFormField => f != null);

    if (reorderedFields.length !== section.fields.length) return;

    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: reorderedFields } : s
      ),
    }));

    setBusy(true);
    const result = await reorderTeacherFormFieldsRequest(accessToken, {
      [sectionId]: orderedKeys,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error("Could not save field order", {
        description: result.message,
      });
      void reload();
      return;
    }

    setConfig(result.data);
    toast.success("Field order saved");
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
                {section.deletable !== false ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label={`Delete ${section.title} section`}
                    onClick={() => setDeleteSectionId(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Drag fields by the grip handle to reorder. Order is saved to the
                API automatically.
              </p>
              <SortableFieldList
                sectionId={section.id}
                fields={section.fields}
                busy={busy}
                onReorder={(sectionId, orderedKeys) =>
                  void reorderFields(sectionId, orderedKeys)
                }
                onToggleFilter={(fieldKey, enabled) =>
                  void toggleFieldFilter(fieldKey, enabled)
                }
                onEdit={(field) => openFieldEdit(field, section.id)}
                onDelete={setDeleteFieldKey}
              />
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
                  const nextLabel = e.target.value;
                  setFieldLabel(nextLabel);
                  if (fieldDialog?.mode !== "add") return;
                  if (
                    isWorkRolePresetType(fieldType) ||
                    fieldType === "countries_states_cities"
                  ) {
                    setFieldKey(slugifyKeysFromLabel(nextLabel));
                  } else {
                    setFieldKey(slugifyKey(nextLabel));
                  }
                }}
              />
            </div>
            {fieldDialog?.mode === "add" &&
            (!isFieldBundlePresetType(fieldType) ||
              bundlePresetShowsKeyField(fieldType)) ? (
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={fieldKey}
                  onChange={(e) => setFieldKey(e.target.value)}
                />
                {isWorkRolePresetType(fieldType) ? (
                  <p className="text-xs text-muted-foreground">
                   
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={fieldType}
                onValueChange={(v) => setFieldType(v as FormBuilderFieldType)}
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
            {fieldDialog?.mode === "edit" ? (
              <p className="text-xs text-muted-foreground">
                Note: Field bundle presets (location / work role) can only be
                used when adding fields.
              </p>
            ) : null}
            {!(fieldDialog?.mode === "add" && isFieldBundlePresetType(fieldType)) &&
              (fieldType === "select" || fieldType === "multiselect") && (
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
