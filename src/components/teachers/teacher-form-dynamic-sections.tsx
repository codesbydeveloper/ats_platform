"use client";

import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type UseFormReturn,
} from "react-hook-form";

import { SearchableMultiSelect } from "@/components/shared/searchable-multi-select";
import { SkillsTagsEditor } from "@/components/teachers/teacher-form-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMultiselectStoredValue,
  parseMultiselectStoredValue,
} from "@/lib/multiselect-form-value";
import { apiFieldKeyToFormKey } from "@/lib/teacher-form-field-map";
import {
  configHasWorkExperienceRows,
  defaultWorkEntry,
  EMPLOYED_FIELD_KEY,
  getEmployedValue,
  getWorkRepeatFieldMeta,
  isWorkExperienceSection,
  isWorkRepeatFieldKey,
  isTeacherRoleFieldKey,
  type WorkRepeatFieldMeta,
} from "@/lib/work-experience-form";
import {
  getCityNamesForState,
  getStateNamesForCountry,
} from "@/lib/locations";
import {
  resolveFieldOptions,
  type TeacherFormOptionsMap,
} from "@/lib/teacher-form-options";
import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
  ApiTeacherFormSection,
} from "@/types/teacher-form-api";
import { cn } from "@/lib/utils";
import { uid } from "@/utils/id";

const FIELD_GRID = "grid w-full grid-cols-1 gap-4 sm:grid-cols-2";

/** Built-in form keys that store multiselect values as string[]. */
const MULTISELECT_ARRAY_FORM_KEYS = new Set([
  "boards",
  "grades",
  "roles",
  "skills",
]);

function fieldItemClass(fullWidth = false) {
  return cn("w-full min-w-0", fullWidth && "sm:col-span-2");
}

function sortFieldsByApiOrder(fields: ApiTeacherFormField[]): ApiTeacherFormField[] {
  return [...fields].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
}

function isLocationFormKey(formKey: string | null): boolean {
  return formKey === "country" || formKey === "state" || formKey === "city";
}

function applyLocationCascade(
  form: UseFormReturn<TeacherFormValues>,
  formKey: string,
  value: string
) {
  if (formKey === "country") {
    // Don't auto-pick a city; let AI/user decide.
    form.setValue("state", "");
    form.setValue("city", "");
    return;
  }
  if (formKey === "state") {
    const country = form.getValues("country");
    if (!country?.trim()) return;
    // Don't auto-pick a city; user should choose after picking a state.
    form.setValue("city", "");
  }
}

function locationSelectEmptyHint(
  formKey: string | null,
  options: string[],
  selectedCountry?: string,
  selectedState?: string
): string {
  if (options.length > 0) return "";
  if (formKey === "state" && !selectedCountry?.trim()) {
    return "Select a country first";
  }
  if (formKey === "city" && !selectedState?.trim()) {
    return "Select a state first";
  }
  return "No options available";
}

function isExtraEducationField(field: ApiTeacherFormField): boolean {
  const k = field.key.toLowerCase();
  return (
    k === "additional_education" ||
    k === "extra_education" ||
    k === "extraeducation" ||
    k === "extra_education_lines" ||
    apiFieldKeyToFormKey(field.key) === "extraEducation"
  );
}

function isSkillsField(field: ApiTeacherFormField): boolean {
  const k = field.key.toLowerCase();
  return k === "skills" || k === "tags" || apiFieldKeyToFormKey(field.key) === "skills";
}

function findSkillsField(config: ApiTeacherFormConfig): ApiTeacherFormField | undefined {
  for (const section of config.sections) {
    const found = section.fields.find(isSkillsField);
    if (found) return found;
  }
  return undefined;
}

function sectionWantsSkillsBlock(section: ApiTeacherFormSection): boolean {
  const t = section.title.toLowerCase();
  const id = section.id.toLowerCase();
  return (
    t.includes("skill") ||
    t.includes("tag") ||
    id.includes("skill") ||
    id === "skills"
  );
}

function defaultWork(roleOptions: string[]): TeacherFormValues["workHistory"][number] {
  return {
    id: uid("work"),
    schoolName: "",
    role: roleOptions[0] ?? "",
    from: new Date().toISOString().slice(0, 10),
    to: null,
    currentlyWorking: true,
  };
}

interface TeacherFormDynamicSectionsProps {
  config: ApiTeacherFormConfig;
  form: UseFormReturn<TeacherFormValues>;
  formOptions: TeacherFormOptionsMap;
  layoutErrors?: Record<string, string>;
  /** When true, Are You Employed is read-only and synced from salary (Yes if salary &gt; 0, else No). */
  isEditMode?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

function WorkEntryDurationTo({
  index,
  field,
  control,
  form,
  layoutError,
  showAddButton,
  onAdd,
}: {
  index: number;
  field: ApiTeacherFormField;
  control: Control<TeacherFormValues>;
  form: UseFormReturn<TeacherFormValues>;
  layoutError?: string;
  showAddButton?: boolean;
  onAdd?: () => void;
}) {
  const tillDate = Boolean(
    form.watch(`workHistory.${index}.currentlyWorking` as const)
  );

  return (
    <div className={cn("min-w-0", showAddButton ? "flex flex-1 gap-2" : "w-full")}>
      <FormItem className={cn("min-w-0 flex-1 space-y-2")}>
        <div className="flex items-center justify-between gap-3">
          <FormLabel className="!mt-0">
            {field.label}
            {field.required && !tillDate ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </FormLabel>
          <FormField
            control={control}
            name={`workHistory.${index}.currentlyWorking`}
            render={({ field: tillField }) => (
              <div className="flex shrink-0 items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={Boolean(tillField.value)}
                    onCheckedChange={(checked) => {
                      const on = Boolean(checked);
                      tillField.onChange(on);
                      if (on) {
                        form.setValue(`workHistory.${index}.to`, null);
                      }
                    }}
                  />
                </FormControl>
                <FormLabel className="!mt-0 cursor-pointer font-normal">
                  Till Date
                </FormLabel>
              </div>
            )}
          />
        </div>
        {!tillDate ? (
          <FormField
            control={control}
            name={`workHistory.${index}.to`}
            render={({ field: f }) => (
              <>
                <FormControl>
                  <Input
                    className="w-full"
                    type="date"
                    value={f.value ?? ""}
                    onChange={f.onChange}
                    onBlur={f.onBlur}
                    name={f.name}
                    ref={f.ref}
                  />
                </FormControl>
                <FieldError message={layoutError} />
                <FormMessage />
              </>
            )}
          />
        ) : (
          <FieldError message={layoutError} />
        )}
      </FormItem>
      {showAddButton && onAdd ? (
        <Button
          type="button"
          variant="default"
          size="icon"
          className="mt-6 h-10 w-10 shrink-0"
          aria-label="Add another work experience"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function WorkExperienceEntries({
  form,
  control,
  meta,
  formOptions,
  layoutErrors,
}: {
  form: UseFormReturn<TeacherFormValues>;
  control: Control<TeacherFormValues>;
  meta: WorkRepeatFieldMeta;
  formOptions: TeacherFormOptionsMap;
  layoutErrors: Record<string, string>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "workHistory",
  });

  const roleField = meta.role;
  const roleOptions = roleField
    ? resolveFieldOptions(
        { ...roleField, type: "multiselect" },
        formOptions
      )
    : [];

  const addEntry = () => {
    append(defaultWorkEntry());
  };

  if (fields.length === 0) {
    return (
      <div className="md:col-span-2">
        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
          <Plus className="mr-2 h-4 w-4" />
          Add work experience
        </Button>
        <FieldError message={layoutErrors.workHistory} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:col-span-2">
      {fields.map((row, index) => (
        <div
          key={row.id}
          className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4"
        >
          {fields.length > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Experience {index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
          ) : null}
          <div className={FIELD_GRID}>
            {meta.school ? (
              <FormField
                control={control}
                name={`workHistory.${index}.schoolName`}
                render={({ field: f }) => (
                  <FormItem className={fieldItemClass()}>
                    <FormLabel>
                      {meta.school!.label}
                      {meta.school!.required ? (
                        <span className="text-destructive" aria-hidden>
                          {" "}
                          *
                        </span>
                      ) : null}
                    </FormLabel>
                    <FormControl>
                      <Input className="w-full" {...f} />
                    </FormControl>
                    <FieldError
                      message={layoutErrors[`workHistory.${index}.schoolName`]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            {roleField ? (
              <FormField
                control={control}
                name={`workHistory.${index}.role`}
                render={({ field: f }) => {
                  const selected = f.value
                    ? String(f.value)
                        .split(/[,;]/)
                        .map((s) => s.trim())
                        .filter(
                          (s) =>
                            Boolean(s) && s !== "—" && s !== "Unknown"
                        )
                    : [];
                  return (
                    <FormItem className={fieldItemClass()}>
                      <FormLabel>
                        {roleField.label}
                        {roleField.required ? (
                          <span className="text-destructive" aria-hidden>
                            {" "}
                            *
                          </span>
                        ) : null}
                      </FormLabel>
                      <FormControl>
                        {roleOptions.length > 0 ? (
                          <SearchableMultiSelect
                            hideLabel
                            label={roleField.label}
                            placeholder={`Select ${roleField.label.toLowerCase()}…`}
                            options={(() => {
                              const out = [...roleOptions];
                              for (const v of selected) {
                                if (v && !out.includes(v)) out.unshift(v);
                              }
                              return out;
                            })()}
                            selected={selected}
                            onChange={(next) =>
                              f.onChange(
                                next.length > 0 ? next.join(", ") : ""
                              )
                            }
                            searchPlaceholder={`Search ${roleField.label.toLowerCase()}…`}
                          />
                        ) : (
                          <Input
                            className="w-full"
                            value={String(f.value ?? "")}
                            onChange={f.onChange}
                            onBlur={f.onBlur}
                            name={f.name}
                            ref={f.ref}
                          />
                        )}
                      </FormControl>
                      <FieldError
                        message={layoutErrors[`workHistory.${index}.role`]}
                      />
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            ) : null}
            {meta.from ? (
              <FormField
                control={control}
                name={`workHistory.${index}.from`}
                render={({ field: f }) => (
                  <FormItem className={fieldItemClass()}>
                    <FormLabel>
                      {meta.from!.label}
                      {meta.from!.required ? (
                        <span className="text-destructive" aria-hidden>
                          {" "}
                          *
                        </span>
                      ) : null}
                    </FormLabel>
                    <FormControl>
                      <Input className="w-full" type="date" {...f} />
                    </FormControl>
                    <FieldError
                      message={layoutErrors[`workHistory.${index}.from`]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            {meta.to ? (
              <div className={fieldItemClass()}>
                <WorkEntryDurationTo
                  index={index}
                  field={meta.to}
                  control={control}
                  form={form}
                  layoutError={layoutErrors[`workHistory.${index}.to`]}
                  showAddButton={index === fields.length - 1}
                  onAdd={addEntry}
                />
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <FieldError message={layoutErrors.workHistory} />
    </div>
  );
}

function WorkExperienceBlock({
  form,
  field,
  layoutError,
}: {
  form: UseFormReturn<TeacherFormValues>;
  field: ApiTeacherFormField;
  layoutError?: string;
}) {
  const roleOptions =
    form.watch("roles")?.length > 0
      ? form.watch("roles")
      : field.options ?? [];

  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: "workHistory",
  });
  const workWatch = form.watch("workHistory") ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{field.label}</CardTitle>
        <FieldError message={layoutError} />
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((row, index) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border bg-muted/30 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Role {index + 1}</p>
              {fields.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <div className={FIELD_GRID}>
              <FormField
                control={form.control}
                name={`workHistory.${index}.schoolName`}
                render={({ field: f }) => (
                  <FormItem className={fieldItemClass(true)}>
                    <FormLabel>School name</FormLabel>
                    <FormControl>
                      <Input className="w-full" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`workHistory.${index}.role`}
                render={({ field: f }) => (
                  <FormItem className={fieldItemClass()}>
                    <FormLabel>Role</FormLabel>
                    {roleOptions.length > 0 ? (
                      <Select onValueChange={f.onChange} value={f.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input className="w-full" {...f} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`workHistory.${index}.from`}
                render={({ field: f }) => (
                  <FormItem className={fieldItemClass()}>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <Input className="w-full" type="date" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`workHistory.${index}.to`}
                render={({ field: f }) => (
                  <FormItem className={fieldItemClass()}>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input
                        className="w-full"
                        type="date"
                        disabled={workWatch[index]?.currentlyWorking}
                        {...f}
                        value={f.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`workHistory.${index}.currentlyWorking`}
                render={({ field: f }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={f.value}
                        onCheckedChange={(c) => f.onChange(!!c)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">
                      Currently working here
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => append(defaultWork(roleOptions))}
        >
          <Plus className="h-4 w-4" />
          Add role
        </Button>
      </CardContent>
    </Card>
  );
}

function ApiFormField({
  field: rawField,
  control,
  layoutError,
  form,
  formOptions,
  selectedCountry,
  selectedState,
  disabled,
}: {
  field: ApiTeacherFormField;
  control: Control<TeacherFormValues>;
  layoutError?: string;
  form: UseFormReturn<TeacherFormValues>;
  formOptions: TeacherFormOptionsMap;
  selectedCountry?: string;
  selectedState?: string;
  disabled?: boolean;
}) {
  const field =
    isTeacherRoleFieldKey(rawField.key) && rawField.type === "text"
      ? { ...rawField, type: "multiselect" as const }
      : rawField;
  const options = resolveFieldOptions(field, formOptions, {
    selectedCountry,
    selectedState,
  });
  const formKey = apiFieldKeyToFormKey(field.key);
  const isQualificationField = field.key === "qualification" || formKey === "qualification";
  const isSelectLike =
    field.type === "select" ||
    field.type === "countries" ||
    field.type === "indian_states" ||
    field.type === "indian_cities";
  const selectOptionsWithCurrent = (value: unknown) => {
    const current = String(value ?? "").trim();
    if (!current) return options;
    return options.includes(current) ? options : [current, ...options];
  };
  const multiselectOptionsWithSelected = (selected: string[]) => {
    if (!selected.length) return options;
    const out = [...options];
    for (const v of selected) {
      const t = String(v ?? "").trim();
      if (t && !out.includes(t)) out.unshift(t);
    }
    return out;
  };

  if (field.type === "work_experience") return null;
  if (formKey === "extraEducation" || isExtraEducationField(field)) return null;
  if (isSkillsField(field)) return null;

  if (field.type === "multiselect") {
    const arrayFormKey =
      formKey && MULTISELECT_ARRAY_FORM_KEYS.has(formKey) ? formKey : null;
    const stringFormKey =
      formKey && !arrayFormKey ? formKey : null;

    return (
      <FormField
        control={control}
        name={
          arrayFormKey
            ? arrayFormKey
            : stringFormKey
              ? stringFormKey
              : (`customFields.${field.key}` as "customFields")
        }
        render={({ field: f }) => (
          <FormItem className={fieldItemClass()}>
            <FormLabel>
              {field.label}
              {field.required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </FormLabel>
            <FormControl>
              <SearchableMultiSelect
                hideLabel
                label={field.label}
                selected={(() => {
                  if (arrayFormKey) {
                    return Array.isArray(f.value) ? (f.value as string[]) : [];
                  }
                  return parseMultiselectStoredValue(f.value);
                })()}
                options={multiselectOptionsWithSelected(
                  (() => {
                    if (arrayFormKey) {
                      return Array.isArray(f.value) ? (f.value as string[]) : [];
                    }
                    return parseMultiselectStoredValue(f.value);
                  })()
                )}
                onChange={(next) => {
                  if (arrayFormKey) {
                    f.onChange(next);
                    return;
                  }
                  if (stringFormKey) {
                    f.onChange(formatMultiselectStoredValue(next));
                    return;
                  }
                  f.onChange(next);
                }}
                searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
              />
            </FormControl>
            <FieldError message={layoutError} />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (!formKey) {
    if (field.type === "boolean") {
      return (
        <FormField
          control={control}
          name={`customFields.${field.key}` as "customFields"}
          render={({ field: f }) => (
            <FormItem
              className={cn(
                fieldItemClass(),
                "flex flex-row items-center gap-2 space-y-0"
              )}
            >
              <FormControl>
                <Checkbox
                  checked={Boolean(f.value)}
                  onCheckedChange={f.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0 font-normal">{field.label}</FormLabel>
              <FieldError message={layoutError} />
            </FormItem>
          )}
        />
      );
    }
    return (
      <FormField
        control={control}
        name={`customFields.${field.key}` as "customFields"}
        render={({ field: f }) => (
          <FormItem
            className={fieldItemClass(field.type === "textarea")}
          >
            <FormLabel>
              {field.label}
              {field.required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </FormLabel>
            <FormControl>
              {field.type === "textarea" ? (
                <Textarea
                  className="w-full"
                  rows={3}
                  value={String(f.value ?? "")}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  name={f.name}
                  ref={f.ref}
                />
              ) : field.type === "number" ? (
                <Input
                  className="w-full"
                  type="number"
                  min={0}
                  value={
                    typeof f.value === "number"
                      ? f.value
                      : f.value == null
                        ? ""
                        : Number(f.value) || ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    f.onChange(raw === "" ? 0 : Number(raw));
                  }}
                />
              ) : isSelectLike ? (
                <Select
                  disabled={disabled}
                  onValueChange={f.onChange}
                  value={String(f.value ?? "")}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectOptionsWithCurrent(f.value).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="w-full"
                  value={String(f.value ?? "")}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  name={f.name}
                  ref={f.ref}
                  type={
                    field.type === "email"
                      ? "email"
                      : field.type === "tel"
                        ? "tel"
                        : field.type === "date"
                          ? "date"
                          : "text"
                  }
                />
              )}
            </FormControl>
            <FieldError message={layoutError} />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (formKey === "status") {
    return (
      <FormField
        control={control}
        name="status"
        render={({ field: f }) => (
          <FormItem className={fieldItemClass()}>
            <FormLabel>{field.label}</FormLabel>
            <Select onValueChange={f.onChange} value={f.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={layoutError} />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  const locationField = formKey != null && isLocationFormKey(formKey);

  if (isSelectLike || formKey === "subject" || locationField) {
    const emptyHint =
      locationField
        ? locationSelectEmptyHint(
            formKey,
            options,
            selectedCountry,
            selectedState
          )
        : "No options — add them under Filter lists";

    if (isQualificationField) {
      return (
        <FormField
          control={control}
          name="qualification"
          render={({ field: f }) => {
            const selected = parseMultiselectStoredValue(f.value);
            return (
              <FormItem className={fieldItemClass()}>
                <FormLabel>
                  {field.label}
                  {field.required ? (
                    <span className="text-destructive" aria-hidden>
                      {" "}
                      *
                    </span>
                  ) : null}
                </FormLabel>
                <FormControl>
                  <SearchableMultiSelect
                    hideLabel
                    label={field.label}
                    placeholder={`Select ${field.label.toLowerCase()}…`}
                    selected={selected}
                    options={multiselectOptionsWithSelected(selected)}
                    onChange={(next) => f.onChange(formatMultiselectStoredValue(next))}
                    searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
                  />
                </FormControl>
                <FieldError message={layoutError} />
                <FormMessage />
              </FormItem>
            );
          }}
        />
      );
    }

    return (
      <FormField
        control={control}
        name={formKey as keyof TeacherFormValues}
        render={({ field: f }) => (
          <FormItem className={fieldItemClass()}>
            <FormLabel>
              {field.label}
              {field.required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </FormLabel>
            <Select
              disabled={disabled}
              onValueChange={(v) => {
                f.onChange(v);
                if (formKey && isLocationFormKey(formKey)) {
                  applyLocationCascade(form, formKey, v);
                }
              }}
              value={
                f.value && String(f.value).trim().length > 0
                  ? String(f.value)
                  : undefined
              }
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="z-[200]">
                {selectOptionsWithCurrent(f.value).length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    {emptyHint}
                  </div>
                ) : (
                  selectOptionsWithCurrent(f.value).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FieldError message={layoutError} />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === "textarea" || formKey === "notes") {
    return (
      <FormField
        control={control}
        name={formKey as keyof TeacherFormValues}
        render={({ field: f }) => (
          <FormItem className={fieldItemClass(true)}>
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              <Textarea
                className="w-full"
                rows={formKey === "address" ? 3 : 5}
                {...f}
                value={String(f.value ?? "")}
              />
            </FormControl>
            <FieldError message={layoutError} />
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={formKey as keyof TeacherFormValues}
      render={({ field: f }) => (
        <FormItem className={fieldItemClass()}>
          <FormLabel>
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </FormLabel>
          <FormControl>
            <Input
              className="w-full"
              name={f.name}
              ref={f.ref}
              onBlur={f.onBlur}
              value={
                typeof f.value === "number"
                  ? f.value
                  : String(f.value ?? "")
              }
              onChange={(e) => {
                let next = e.target.value;
                if (formKey === "name") {
                  next = next.replace(/[^a-zA-Z\s.'-]/g, "");
                } else if (formKey === "mobile") {
                  let digits = next.replace(/\D/g, "");
                  const country = String(form.getValues("country") ?? "").trim();
                  if (country.toLowerCase() === "india") {
                    if (digits.length >= 12 && digits.startsWith("91")) {
                      digits = digits.slice(2);
                    } else if (digits.length === 11 && digits.startsWith("0")) {
                      digits = digits.slice(1);
                    }
                    if (digits.length > 10) {
                      digits = digits.slice(-10);
                    }
                  }
                  next = digits;
                }
                f.onChange(next);
              }}
              inputMode={
                formKey === "mobile"
                  ? "numeric"
                  : formKey === "email"
                    ? "email"
                    : undefined
              }
              type={
                field.type === "email" || formKey === "email"
                  ? "email"
                  : field.type === "tel" || formKey === "mobile"
                    ? "tel"
                    : field.type === "number"
                      ? "number"
                      : field.type === "date"
                        ? "date"
                        : "text"
              }
            />
          </FormControl>
          <FieldError message={layoutError} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ExtraEducationBlock({
  form,
  label,
}: {
  form: UseFormReturn<TeacherFormValues>;
  label: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "extraEducation",
  });

  return (
    <div className={cn("space-y-3", fieldItemClass(true))}>
      <p className="text-sm font-medium">{label}</p>
      {fields.map((row, index) => (
        <FormField
          key={row.id}
          control={form.control}
          name={`extraEducation.${index}.value`}
          render={({ field: f }) => (
            <FormItem className="w-full min-w-0">
              <div className="flex w-full gap-2">
                <FormControl className="min-w-0 flex-1">
                  <Input
                    className="w-full"
                    {...f}
                    placeholder="Additional detail"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={`Remove line ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => append({ id: uid("edu-extra"), value: "" })}
      >
        <Plus className="h-4 w-4" />
        Add more
      </Button>
    </div>
  );
}

function SkillsBlock({
  form,
  field,
  layoutError,
}: {
  form: UseFormReturn<TeacherFormValues>;
  field: ApiTeacherFormField;
  layoutError?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{field.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="skills"
          render={({ field: f }) => (
            <FormItem className="w-full min-w-0">
              <SkillsTagsEditor
                value={(f.value as string[]) ?? []}
                onChange={f.onChange}
              />
              {layoutError ? (
                <p className="text-sm font-medium text-destructive">{layoutError}</p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

export function TeacherFormDynamicSections({
  config,
  form,
  formOptions,
  layoutErrors = {},
  isEditMode = false,
}: TeacherFormDynamicSectionsProps) {
  const selectedCountry = form.watch("country");
  const selectedState = form.watch("state");
  const employedValue = getEmployedValue(form.watch("customFields") ?? {});
  const employedNo = employedValue.trim().toLowerCase() === "no";

  const skillsField = findSkillsField(config);
  let skillsRendered = false;

  useEffect(() => {
    if (!configHasWorkExperienceRows(config)) return;

    if (!employedNo && form.getValues("workHistory").length === 0) {
      form.setValue("workHistory", [defaultWorkEntry()]);
    }
  }, [config, form, employedNo]);

  if (config.sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Form layout not loaded. Check that GET /api/teacher-form is available.
      </p>
    );
  }

  return (
    <>
      {config.sections.map((section) => {
        const workField = section.fields.find((f) => f.type === "work_experience");
        const extraField = section.fields.find(isExtraEducationField);
        /** Skills only in a dedicated section (title/id mentions skills), not inside Teaching. */
        const showSkillsHere =
          skillsField &&
          !skillsRendered &&
          sectionWantsSkillsBlock(section);

        const isWorkSection = isWorkExperienceSection(section);
        const workMeta = isWorkSection
          ? getWorkRepeatFieldMeta(section)
          : null;

        const gridFields = sortFieldsByApiOrder(
          section.fields.filter(
            (f) =>
              f.type !== "work_experience" &&
              !isExtraEducationField(f) &&
              !isSkillsField(f) &&
              !(isWorkSection && isWorkRepeatFieldKey(f.key))
          )
        );

        if (showSkillsHere) {
          skillsRendered = true;
        }

        const hasCard =
          gridFields.length > 0 || extraField != null;

        return (
          <div key={section.id} className="space-y-6">
            {hasCard ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  {section.description ? (
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className={FIELD_GRID}>
                  {(() => {
                    const repeatOrders = section.fields
                      .filter((f) => isWorkRepeatFieldKey(f.key))
                      .map((f) => f.sortOrder ?? 999);
                    const repeatMin =
                      repeatOrders.length > 0
                        ? Math.min(...repeatOrders)
                        : null;
                    const repeatMax =
                      repeatOrders.length > 0
                        ? Math.max(...repeatOrders)
                        : null;

                    const visibleInWorkSection = (field: ApiTeacherFormField) => {
                      if (!isWorkSection) return true;
                      if (employedNo) {
                        // When not employed, only show the "Are You Employed" field.
                        return field.key === EMPLOYED_FIELD_KEY;
                      }
                      return true;
                    };

                    const renderField = (field: ApiTeacherFormField) => {
                      return (
                        <ApiFormField
                          key={field.id || field.key}
                          field={field}
                          control={form.control}
                          form={form}
                          formOptions={formOptions}
                          selectedCountry={selectedCountry}
                          selectedState={selectedState}
                          layoutError={layoutErrors[field.key]}
                        />
                      );
                    };

                    const beforeWork = sortFieldsByApiOrder(
                      (isWorkSection && repeatMin != null && repeatMax != null
                        ? gridFields.filter((f) => {
                            const order = f.sortOrder ?? 0;
                            const inRepeatRange =
                              order >= repeatMin && order <= repeatMax;
                            // Important: do not drop non-repeat fields whose
                            // sortOrder falls between repeat fields.
                            return order <= repeatMin || inRepeatRange;
                          })
                        : gridFields
                      ).filter(visibleInWorkSection)
                    );
                    const afterWork = sortFieldsByApiOrder(
                      (isWorkSection && repeatMax != null
                        ? gridFields.filter((f) => (f.sortOrder ?? 0) > repeatMax)
                        : []
                      ).filter(visibleInWorkSection)
                    );

                    return (
                      <>
                        {beforeWork.map((field) => renderField(field))}
                        {!employedNo && (workMeta?.school || workMeta?.from) ? (
                          <WorkExperienceEntries
                            form={form}
                            control={form.control}
                            meta={workMeta}
                            formOptions={formOptions}
                            layoutErrors={layoutErrors}
                          />
                        ) : null}
                        {afterWork.map((field) => renderField(field))}
                      </>
                    );
                  })()}
                  {extraField ? (
                    <ExtraEducationBlock
                      form={form}
                      label={extraField.label}
                    />
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
            {workField ? (
              <WorkExperienceBlock
                form={form}
                field={workField}
                layoutError={layoutErrors.workHistory ?? layoutErrors[workField.key]}
              />
            ) : null}
            {showSkillsHere && skillsField ? (
              <SkillsBlock
                form={form}
                field={skillsField}
                layoutError={layoutErrors[skillsField.key]}
              />
            ) : null}
          </div>
        );
      })}
      {skillsField && !skillsRendered ? (
        <SkillsBlock
          form={form}
          field={skillsField}
          layoutError={layoutErrors[skillsField.key]}
        />
      ) : null}
    </>
  );
}
