"use client";

import { Plus, X } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type UseFormReturn,
} from "react-hook-form";

import { MultiToggle, SkillsTagsEditor } from "@/components/teachers/teacher-form-controls";
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
import { apiFieldKeyToFormKey } from "@/lib/teacher-form-field-map";
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

const FIELD_GRID = "grid w-full gap-4 md:grid-cols-2";

function fieldItemClass(fullWidth = false) {
  return cn("w-full min-w-0", fullWidth && "md:col-span-2");
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
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
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
  field,
  control,
  layoutError,
  form,
  formOptions,
  selectedState,
}: {
  field: ApiTeacherFormField;
  control: Control<TeacherFormValues>;
  layoutError?: string;
  form: UseFormReturn<TeacherFormValues>;
  formOptions: TeacherFormOptionsMap;
  selectedState?: string;
}) {
  const options = resolveFieldOptions(field, formOptions, selectedState);
  const formKey = apiFieldKeyToFormKey(field.key);

  if (field.type === "work_experience") return null;
  if (formKey === "extraEducation" || isExtraEducationField(field)) return null;
  if (isSkillsField(field)) return null;

  if (!formKey) {
    if (field.type === "multiselect") {
      return (
        <FormField
          control={control}
          name={`customFields.${field.key}` as "customFields"}
          render={({ field: f }) => (
            <FormItem className={fieldItemClass(true)}>
              <FormControl>
                <MultiToggle
                  label={field.label}
                  options={options}
                  value={Array.isArray(f.value) ? (f.value as string[]) : []}
                  onChange={f.onChange}
                  minSelected={field.required ? 1 : 0}
                />
              </FormControl>
              <FieldError message={layoutError} />
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
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
            className={fieldItemClass(
              field.type === "textarea" || field.type === "multiselect"
            )}
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
                  value={f.value as number | undefined}
                  onChange={(e) =>
                    f.onChange(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              ) : field.type === "select" ? (
                <Select
                  onValueChange={f.onChange}
                  value={String(f.value ?? "")}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((o) => (
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

  if (field.type === "multiselect" || formKey === "boards" || formKey === "grades" || formKey === "roles") {
    return (
      <FormField
        control={control}
        name={formKey}
        render={({ field: f }) => (
          <FormItem className={fieldItemClass(true)}>
            <FormControl>
              <MultiToggle
                label={field.label}
                options={options}
                value={(f.value as string[]) ?? []}
                onChange={f.onChange}
                minSelected={field.required ? 1 : 0}
              />
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

  if (field.type === "select" || formKey === "state" || formKey === "city" || formKey === "subject") {
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
              onValueChange={(v) => {
                f.onChange(v);
                if (formKey === "state") {
                  const cities = formOptions.citiesByState[v];
                  if (cities?.length) {
                    form.setValue("city", cities[0]!);
                  } else {
                    form.setValue("city", "");
                  }
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
                {options.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No options — add them under Filter lists
                  </div>
                ) : (
                  options.map((o) => (
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

  if (field.type === "textarea" || formKey === "address" || formKey === "notes") {
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
              {...f}
              value={
                typeof f.value === "number"
                  ? f.value
                  : String(f.value ?? "")
              }
              type={
                field.type === "email"
                  ? "email"
                  : field.type === "tel"
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
}: TeacherFormDynamicSectionsProps) {
  const selectedState = form.watch("state");
  const skillsField = findSkillsField(config);
  let skillsRendered = false;

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

        const gridFields = section.fields.filter(
          (f) =>
            f.type !== "work_experience" &&
            !isExtraEducationField(f) &&
            !isSkillsField(f)
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
                  {gridFields.map((field) => (
                    <ApiFormField
                      key={field.id || field.key}
                      field={field}
                      control={form.control}
                      form={form}
                      formOptions={formOptions}
                      selectedState={selectedState}
                      layoutError={layoutErrors[field.key]}
                    />
                  ))}
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
