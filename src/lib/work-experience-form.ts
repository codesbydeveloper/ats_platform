import { isPlaceholderValue } from "@/lib/sanitize-api-values";
import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
  ApiTeacherFormSection,
} from "@/types/teacher-form-api";
import { uid } from "@/utils/id";

export const EMPLOYED_FIELD_KEY = "employed";
export const SALARY_FIELD_KEY = "salary";

export function isSalaryFieldKey(key: string): boolean {
  return (
    key === SALARY_FIELD_KEY ||
    key === "current_salary" ||
    key === "currentSalary"
  );
}

/** Hidden when Are You Employed = No */
export const WORK_DETAIL_FIELD_KEYS = new Set([
  "salary",
  "school_organization",
  "role",
  "teacher_role",
  "duration_from",
  "duration_to",
  "total_years_experience",
]);

export const WORK_REPEAT_FIELD_KEYS = new Set([
  "school_organization",
  "role",
  "teacher_role",
  "duration_from",
  "duration_to",
]);

export function isWorkRepeatFieldKey(key: string): boolean {
  return WORK_REPEAT_FIELD_KEYS.has(key);
}

export function isWorkDetailFieldKey(key: string): boolean {
  return (
    WORK_DETAIL_FIELD_KEYS.has(key) || WORK_REPEAT_FIELD_KEYS.has(key)
  );
}

export function getEmployedValue(
  customFields: TeacherFormValues["customFields"] | undefined
): string {
  if (!customFields) return "";
  const v = customFields[EMPLOYED_FIELD_KEY];
  return v != null ? String(v).trim() : "";
}

export function isEmployedNo(
  customFields: TeacherFormValues["customFields"] | undefined
): boolean {
  return getEmployedValue(customFields).toLowerCase() === "no";
}

export function isEmployedYes(
  customFields: TeacherFormValues["customFields"] | undefined
): boolean {
  return getEmployedValue(customFields).toLowerCase() === "yes";
}

/** True when top-level `currentSalary` or custom `salary` is greater than zero. */
export function hasPositiveCurrentSalary(
  currentSalary: number | undefined,
  customFields: TeacherFormValues["customFields"] | undefined
): boolean {
  const top = Number(currentSalary) || 0;
  if (top > 0) return true;
  const fromCustom = Number(customFields?.salary);
  return !Number.isNaN(fromCustom) && fromCustom > 0;
}

/** "Are You Employed" is always shown (add + edit). */
export function shouldShowEmployedField(): boolean {
  return true;
}

/** Yes when salary &gt; 0, otherwise No (edit mode). */
export function employedValueFromSalary(
  currentSalary: number | undefined,
  customFields: TeacherFormValues["customFields"] | undefined
): "Yes" | "No" {
  return hasPositiveCurrentSalary(currentSalary, customFields) ? "Yes" : "No";
}

/** Salary field stays visible in edit; other work rows follow employed / salary. */
export function shouldShowSalaryField(
  isEditMode: boolean,
  customFields: TeacherFormValues["customFields"] | undefined,
  currentSalary?: number
): boolean {
  if (isEditMode) return true;
  return shouldShowWorkDetailFields(false, customFields, currentSalary);
}

/** Show school, role, dates, total experience (not salary — use shouldShowSalaryField). */
export function shouldShowWorkDetailFields(
  isEditMode: boolean,
  customFields: TeacherFormValues["customFields"] | undefined,
  currentSalary?: number
): boolean {
  if (hasPositiveCurrentSalary(currentSalary, customFields)) return true;
  if (isEditMode && isEmployedYes(customFields)) return true;
  return !isEmployedNo(customFields);
}

export function isWorkDetailFieldKeyExcludingSalary(key: string): boolean {
  return isWorkDetailFieldKey(key) && !isSalaryFieldKey(key);
}

/** When salary is set, employed must be Yes. */
export function validateEmployedWhenSalarySet(
  values: TeacherFormValues
): Record<string, string> {
  if (!hasPositiveCurrentSalary(values.currentSalary, values.customFields)) {
    return {};
  }
  if (isEmployedYes(values.customFields)) return {};
  return {
    [EMPLOYED_FIELD_KEY]:
      "Are You Employed must be Yes when current salary is greater than 0",
  };
}

export function isWorkExperienceSection(section: ApiTeacherFormSection): boolean {
  return (
    section.id === "work-experience" ||
    section.fields.some((f) => f.key === "school_organization")
  );
}

export function configHasWorkExperienceRows(config: ApiTeacherFormConfig): boolean {
  return config.sections.some(isWorkExperienceSection);
}

export type WorkRepeatFieldMeta = {
  school?: ApiTeacherFormField;
  role?: ApiTeacherFormField;
  from?: ApiTeacherFormField;
  to?: ApiTeacherFormField;
};

export function getWorkRepeatFieldMeta(
  section: ApiTeacherFormSection
): WorkRepeatFieldMeta {
  return {
    school: section.fields.find((f) => f.key === "school_organization"),
    role: section.fields.find(
      (f) => f.key === "role" || f.key === "teacher_role"
    ),
    from: section.fields.find((f) => f.key === "duration_from"),
    to: section.fields.find((f) => f.key === "duration_to"),
  };
}

export function defaultWorkEntry(
  role = ""
): TeacherFormValues["workHistory"][number] {
  return {
    id: uid("work"),
    schoolName: "",
    role,
    from: new Date().toISOString().slice(0, 10),
    to: null,
    currentlyWorking: false,
  };
}

function isEmptyStr(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

/** Treat resume/API placeholders as empty for validation and forms. */
export function isBlankFieldValue(v: unknown): boolean {
  return isPlaceholderValue(String(v ?? ""));
}

function normalizeDateForInput(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") {
    return new Date().toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Clean work rows from resume parse / API before binding to the form. */
export function normalizeWorkHistoryForForm(
  entries: TeacherFormValues["workHistory"]
): TeacherFormValues["workHistory"] {
  return entries
    .map((w) => ({
      id: w.id?.startsWith("work") ? w.id : uid("work"),
      schoolName: isBlankFieldValue(w.schoolName)
        ? ""
        : String(w.schoolName).trim(),
      role: isBlankFieldValue(w.role) ? "" : String(w.role).trim(),
      from: normalizeDateForInput(w.from),
      to: w.currentlyWorking
        ? null
        : w.to
          ? normalizeDateForInput(w.to)
          : null,
      currentlyWorking: Boolean(w.currentlyWorking),
    }))
    .filter((w) => !isBlankFieldValue(w.role) || !isBlankFieldValue(w.schoolName));
}

/** Validate repeatable work rows (school, role, dates) from API form config. */
export function validateWorkHistoryEntries(
  values: TeacherFormValues,
  section: ApiTeacherFormSection
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (isEmployedNo(values.customFields)) return errors;

  const meta = getWorkRepeatFieldMeta(section);
  if (!meta.school && !meta.from) return errors;

  const entries = values.workHistory ?? [];
  if (entries.length === 0) {
    errors.workHistory = "Add at least one work experience";
    return errors;
  }

  entries.forEach((w, i) => {
    if (meta.school?.required && isBlankFieldValue(w.schoolName)) {
      errors[`workHistory.${i}.schoolName`] =
        `${meta.school.label} is required`;
    }
    if (meta.role?.required && isBlankFieldValue(w.role)) {
      errors[`workHistory.${i}.role`] = `${meta.role.label} is required`;
    }
    if (meta.from?.required && isEmptyStr(w.from)) {
      errors[`workHistory.${i}.from`] = `${meta.from.label} is required`;
    }
    if (
      meta.to?.required &&
      !w.currentlyWorking &&
      isEmptyStr(w.to)
    ) {
      errors[`workHistory.${i}.to`] =
        `${meta.to.label} is required (or check Till Date)`;
    }
    if (!isEmptyStr(w.from) && !w.currentlyWorking && !isEmptyStr(w.to)) {
      const fromMs = new Date(w.from).getTime();
      const toMs = new Date(w.to!).getTime();
      if (
        !Number.isNaN(fromMs) &&
        !Number.isNaN(toMs) &&
        toMs < fromMs
      ) {
        errors[`workHistory.${i}.to`] =
          "End date must be on or after start date";
      }
    }
  });

  return errors;
}
