import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import {
  formatMultiselectStoredValue,
  parseMultiselectStoredValue,
} from "@/lib/multiselect-form-value";

/** Values that must never be persisted — UI/list placeholders only. */
const PLACEHOLDER_EXACT = new Set([
  "—",
  "–",
  "-",
  "N/A",
  "n/a",
  "NA",
  "na",
  "null",
  "undefined",
  "Unknown",
  "unknown",
  "None",
  "none",
]);

export function isPlaceholderValue(value: string | null | undefined): boolean {
  const t = String(value ?? "").trim();
  if (!t) return true;
  return PLACEHOLDER_EXACT.has(t);
}

/** Strip placeholders before API submit or form bind. */
export function sanitizeApiText(value: string | null | undefined): string {
  const t = String(value ?? "").trim();
  if (isPlaceholderValue(t)) return "";
  return t;
}

export function sanitizeApiStringArray(values: string[] | undefined): string[] {
  if (!values?.length) return [];
  return values
    .map((s) => sanitizeApiText(s))
    .filter(Boolean);
}

function sanitizeCustomFields(
  cf: TeacherFormValues["customFields"] | undefined
): TeacherFormValues["customFields"] {
  if (!cf || typeof cf !== "object") return {};
  const out: TeacherFormValues["customFields"] = {};
  for (const [key, raw] of Object.entries(cf)) {
    if (Array.isArray(raw)) {
      const arr = sanitizeApiStringArray(raw.map(String));
      if (arr.length) out[key] = arr;
      continue;
    }
    if (typeof raw === "boolean" || typeof raw === "number") {
      out[key] = raw;
      continue;
    }
    const text = sanitizeApiText(String(raw));
    if (text) out[key] = text;
  }
  return out;
}

/** Normalize form state so add/edit never send em-dash or similar placeholders. */
export function sanitizeTeacherFormValues(
  values: TeacherFormValues
): TeacherFormValues {
  const subjects = sanitizeApiStringArray(
    parseMultiselectStoredValue(values.subject)
  );

  return {
    ...values,
    name: sanitizeApiText(values.name),
    mobile: sanitizeApiText(values.mobile),
    email: sanitizeApiText(values.email),
    country: sanitizeApiText(values.country) || "India",
    state: sanitizeApiText(values.state),
    city: sanitizeApiText(values.city),
    address: sanitizeApiText(values.address),
    ugCollege: sanitizeApiText(values.ugCollege),
    pgUniversity: sanitizeApiText(values.pgUniversity),
    qualification: sanitizeApiText(values.qualification),
    certifications: formatMultiselectStoredValue(
      sanitizeApiStringArray(parseMultiselectStoredValue(values.certifications))
    ),
    subject: formatMultiselectStoredValue(subjects),
    boards: sanitizeApiStringArray(values.boards),
    grades: sanitizeApiStringArray(values.grades),
    roles: sanitizeApiStringArray(values.roles),
    skills: sanitizeApiStringArray(values.skills),
    currentLocation: sanitizeApiText(values.currentLocation),
    preferredLocation: sanitizeApiText(values.preferredLocation),
    areaOfInterest: formatMultiselectStoredValue(
      sanitizeApiStringArray(
        parseMultiselectStoredValue(values.areaOfInterest)
      )
    ),
    notes: sanitizeApiText(values.notes ?? ""),
    extraEducation: (values.extraEducation ?? [])
      .map((e) => ({ ...e, value: sanitizeApiText(e.value) }))
      .filter((e) => e.value.length > 0),
    workHistory: (values.workHistory ?? []).map((w) => ({
      ...w,
      schoolName: sanitizeApiText(w.schoolName),
      role: sanitizeApiText(w.role),
    })),
    customFields: sanitizeCustomFields(values.customFields),
  };
}
