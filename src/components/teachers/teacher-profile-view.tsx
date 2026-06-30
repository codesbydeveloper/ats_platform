"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";

import { teacherToFormValues } from "@/components/teachers/teacher-form-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeacherFormRequest } from "@/lib/teacher-form-api";
import { apiFieldKeyToFormKey } from "@/lib/teacher-form-field-map";
import { getTeacherValueForFilterKey } from "@/lib/category-filter-fields";
import {
  parseApiStringArray,
  parseMultiselectStoredValue,
} from "@/lib/multiselect-form-value";
import { isPlaceholderValue } from "@/lib/sanitize-api-values";
import { resolveTeacherAreaOfInterest } from "@/lib/teachers-api";
import {
  isWorkExperienceSection,
  isWorkRepeatFieldKey,
} from "@/lib/work-experience-form";
import { useAuthStore } from "@/store/auth-store";
import type { Teacher, TeacherWorkExperience } from "@/types/teacher";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
  ApiTeacherFormSection,
} from "@/types/teacher-form-api";
import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import { cn } from "@/lib/utils";

function display(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const s = String(value).trim();
  return s === "" || s === "—" || isPlaceholderValue(s) ? "—" : s;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return display(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatList(items: string[] | undefined): string {
  if (!items?.length) return "—";
  const visible = items.map((s) => s.trim()).filter((s) => s && !isPlaceholderValue(s));
  return visible.length ? visible.join(", ") : "—";
}

function isAreaOfInterestKey(key: string): boolean {
  const n = key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return n === "area_of_interest" || n === "areas_of_interest";
}

function isResumeFieldKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === "resume" || k.includes("resume");
}

function isExtraEducationField(field: ApiTeacherFormField): boolean {
  const k = field.key.toLowerCase();
  return (
    k === "additional_education" ||
    k === "extra_education" ||
    k === "extra_education_lines" ||
    apiFieldKeyToFormKey(field.key) === "extraEducation"
  );
}

function sortSections(
  sections: ApiTeacherFormSection[]
): ApiTeacherFormSection[] {
  return [...sections].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
}

function sortFields(fields: ApiTeacherFormField[]): ApiTeacherFormField[] {
  return [...fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function formatFormValue(
  value: unknown,
  field: ApiTeacherFormField
): string {
  if (value == null) return "—";
  if (Array.isArray(value)) {
    const items = parseApiStringArray(value);
    return items.length ? items.join(", ") : "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "—";
  }
  const text = String(value).trim();
  if (!text || isPlaceholderValue(text)) return "—";
  if (
    field.type === "multiselect" ||
    field.type === "teacher_roles" ||
    field.type === "select"
  ) {
    const parsed = parseMultiselectStoredValue(text);
    if (parsed.length) return parsed.join(", ");
  }
  if (field.type === "date") return formatDate(text);
  return text;
}

function resolveFieldDisplayValue(
  teacher: Teacher,
  field: ApiTeacherFormField,
  values: TeacherFormValues
): string {
  if (isResumeFieldKey(field.key)) {
    return display(teacher.resumeFileName);
  }

  if (isAreaOfInterestKey(field.key)) {
    const items = resolveTeacherAreaOfInterest(teacher);
    return items.length ? items.join(", ") : "—";
  }

  if (isExtraEducationField(field)) {
    const lines =
      values.extraEducation?.map((e) => e.value).filter(Boolean) ??
      teacher.extraEducation ??
      [];
    return lines.length ? lines.join(", ") : "—";
  }

  const fromGetter = getTeacherValueForFilterKey(teacher, field.key);
  if (Array.isArray(fromGetter) && fromGetter.length) {
    return fromGetter.join(", ");
  }
  if (typeof fromGetter === "string" && fromGetter.trim()) {
    return display(fromGetter);
  }

  const formKey = apiFieldKeyToFormKey(field.key);
  if (formKey && formKey in values && formKey !== "workHistory") {
    return formatFormValue(
      values[formKey as keyof TeacherFormValues],
      field
    );
  }

  const custom = values.customFields?.[field.key];
  if (custom != null) return formatFormValue(custom, field);

  return "—";
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5",
        className
      )}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground break-words">
        {value}
      </dd>
    </div>
  );
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | null;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function WorkRoleCard({
  role,
  index,
}: {
  role: TeacherWorkExperience;
  index: number;
}) {
  const period = role.currentlyWorking
    ? `${formatDate(role.from)} – Present`
    : `${formatDate(role.from)} – ${formatDate(role.to)}`;
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
      <p className="text-sm font-semibold text-foreground">Role {index + 1}</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <ProfileField label="School" value={display(role.schoolName)} />
        <ProfileField label="Role" value={display(role.role)} />
        <ProfileField label="Period" value={period} className="sm:col-span-2" />
        <ProfileField
          label="Currently working here"
          value={role.currentlyWorking ? "Yes" : "No"}
        />
      </dl>
    </div>
  );
}

function ResumeField({
  teacher,
  label,
  onDownloadResume,
  resumeDownloading,
}: {
  teacher: Teacher;
  label: string;
  onDownloadResume?: () => void;
  resumeDownloading?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 sm:col-span-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {display(teacher.resumeFileName)}
        </span>
        {onDownloadResume && teacher.resumeFileName ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={resumeDownloading}
            onClick={onDownloadResume}
          >
            {resumeDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
          </Button>
        ) : null}
      </dd>
    </div>
  );
}

function ProfileSectionFields({
  section,
  teacher,
  values,
  onDownloadResume,
  resumeDownloading,
}: {
  section: ApiTeacherFormSection;
  teacher: Teacher;
  values: TeacherFormValues;
  onDownloadResume?: () => void;
  resumeDownloading?: boolean;
}) {
  const isWorkSection = isWorkExperienceSection(section);
  const hasWorkExperienceField = section.fields.some(
    (f) => f.type === "work_experience"
  );

  const gridFields = sortFields(
    section.fields.filter((field) => {
      if (field.type === "work_experience") return false;
      if (isWorkSection && isWorkRepeatFieldKey(field.key)) return false;
      return true;
    })
  );

  const showWorkHistory = isWorkSection || hasWorkExperienceField;
  const resumeInSection = gridFields.some((f) => isResumeFieldKey(f.key));
  const showResumeFallback =
    !resumeInSection &&
    teacher.resumeFileName?.trim() &&
    /resume|document/i.test(section.title);

  return (
    <div className="space-y-4">
      {gridFields.length > 0 || showResumeFallback ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gridFields.map((field) =>
            isResumeFieldKey(field.key) ? (
              <ResumeField
                key={`${section.id}-${field.key}`}
                teacher={teacher}
                label={field.label}
                onDownloadResume={onDownloadResume}
                resumeDownloading={resumeDownloading}
              />
            ) : (
              <ProfileField
                key={`${section.id}-${field.key}`}
                label={field.label}
                value={resolveFieldDisplayValue(teacher, field, values)}
              />
            )
          )}
          {showResumeFallback ? (
            <ResumeField
              teacher={teacher}
              label="Resume"
              onDownloadResume={onDownloadResume}
              resumeDownloading={resumeDownloading}
            />
          ) : null}
        </dl>
      ) : null}

      {showWorkHistory ? (
        teacher.workHistory.length > 0 ? (
          <div className="space-y-4">
            {teacher.workHistory.map((w, i) => (
              <WorkRoleCard key={w.id} role={w} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No work history recorded.
          </p>
        )
      ) : null}
    </div>
  );
}

export interface TeacherProfileViewProps {
  teacher: Teacher;
  loading?: boolean;
  onDownloadResume?: () => void;
  resumeDownloading?: boolean;
}

export function TeacherProfileView({
  teacher,
  loading,
  onDownloadResume,
  resumeDownloading,
}: TeacherProfileViewProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [formConfig, setFormConfig] = useState<ApiTeacherFormConfig | null>(
    null
  );
  const [formLoading, setFormLoading] = useState(true);

  const formValues = useMemo(() => teacherToFormValues(teacher), [teacher]);

  useEffect(() => {
    if (!accessToken) {
      setFormConfig(null);
      setFormLoading(false);
      return;
    }
    setFormLoading(true);
    void getTeacherFormRequest(accessToken).then((result) => {
      setFormLoading(false);
      if (result.ok) setFormConfig(result.data);
      else setFormConfig(null);
    });
  }, [accessToken]);

  const sections = useMemo(
    () => sortSections(formConfig?.sections ?? []),
    [formConfig]
  );

  const resumeShown = sections.some((section) =>
    section.fields.some((f) => isResumeFieldKey(f.key))
  );

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Loading latest details from the server…
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Teacher ID: {display(teacher.teacherCode ?? teacher.id)}
        </span>
        {teacher.createdAt ? (
          <span className="text-sm text-muted-foreground">
            Added {formatDate(teacher.createdAt)}
          </span>
        ) : null}
      </div>

      {formLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Loading form layout…
        </div>
      ) : sections.length > 0 ? (
        sections.map((section) => (
          <ProfileSection
            key={section.id}
            title={section.title}
            description={section.description}
          >
            <ProfileSectionFields
              section={section}
              teacher={teacher}
              values={formValues}
              onDownloadResume={onDownloadResume}
              resumeDownloading={resumeDownloading}
            />
          </ProfileSection>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          Form layout not available. Sign in to load the teacher form
          configuration.
        </p>
      )}

      {!resumeShown && teacher.resumeFileName?.trim() ? (
        <ProfileSection title="Resume">
          <dl className="grid gap-3 sm:grid-cols-2">
            <ResumeField
              teacher={teacher}
              label="Resume file"
              onDownloadResume={onDownloadResume}
              resumeDownloading={resumeDownloading}
            />
          </dl>
        </ProfileSection>
      ) : null}
    </div>
  );
}
