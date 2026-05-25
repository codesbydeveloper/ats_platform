import { multiselectHasValue } from "@/lib/multiselect-form-value";
import { apiFieldKeyToFormKey } from "@/lib/teacher-form-field-map";
import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import {
  EMPLOYED_FIELD_KEY,
  hasPositiveCurrentSalary,
  isBlankFieldValue,
  isEmployedNo,
  isWorkDetailFieldKey,
  isWorkExperienceSection,
  isWorkRepeatFieldKey,
  validateEmployedWhenSalarySet,
  isWorkDetailFieldKeyExcludingSalary,
  isSalaryFieldKey,
  validateWorkHistoryEntries,
} from "@/lib/work-experience-form";
import type { ApiTeacherFormConfig } from "@/types/teacher-form-api";

function isEmptyStr(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

function isEmptyArr(v: unknown): boolean {
  return !Array.isArray(v) || v.length === 0;
}

function hasWorkHistoryRole(values: TeacherFormValues): boolean {
  return (values.workHistory ?? []).some((w) => !isBlankFieldValue(w.role));
}

function isRequiredNumberMissing(raw: unknown): boolean {
  if (raw === "" || raw === null || raw === undefined) return true;
  if (typeof raw === "number") return Number.isNaN(raw);
  const n = Number(raw);
  return Number.isNaN(n);
}

export function validateDynamicTeacherForm(
  values: TeacherFormValues,
  config: ApiTeacherFormConfig
): Record<string, string> {
  const errors: Record<string, string> = {};

  Object.assign(errors, validateEmployedWhenSalarySet(values));

  for (const section of config.sections) {
    if (isWorkExperienceSection(section)) {
      Object.assign(errors, validateWorkHistoryEntries(values, section));
    }

    for (const field of section.fields) {
      if (isWorkRepeatFieldKey(field.key)) continue;
      if (
        isWorkExperienceSection(section) &&
        isEmployedNo(values.customFields) &&
        !hasPositiveCurrentSalary(values.currentSalary, values.customFields) &&
        isWorkDetailFieldKeyExcludingSalary(field.key)
      ) {
        continue;
      }
      if (isSalaryFieldKey(field.key) && isEmployedNo(values.customFields)) {
        continue;
      }
      if (!field.required) continue;

      if (field.type === "work_experience") {
        if (isEmptyArr(values.workHistory)) {
          errors.workHistory = `${field.label} is required`;
          continue;
        }
        const badEnd = values.workHistory.some(
          (w) => !w.currentlyWorking && isEmptyStr(w.to)
        );
        if (badEnd) {
          errors.workHistory =
            "Provide end date or mark as currently working for each role";
        }
        continue;
      }

      const formKey = apiFieldKeyToFormKey(field.key);
      if (!formKey) {
        const v = values.customFields?.[field.key];
        if (field.type === "multiselect") {
          if (isEmptyArr(v)) errors[field.key] = `${field.label} is required`;
        } else if (field.type === "boolean") {
          /* optional boolean */
        } else if (isEmptyStr(v)) {
          errors[field.key] = `${field.label} is required`;
        }
        continue;
      }

      const raw = (values as Record<string, unknown>)[formKey];
      const customFallback = values.customFields?.[field.key];

      if (field.type === "multiselect") {
        const hasValue =
          multiselectHasValue(raw) || multiselectHasValue(customFallback);
        if (!hasValue) {
          errors[field.key] = `${field.label} is required`;
        }
        continue;
      }

      if (formKey === "boards" || formKey === "grades" || formKey === "skills") {
        if (isEmptyArr(raw)) errors[field.key] = `${field.label} is required`;
        continue;
      }
      if (formKey === "roles") {
        if (isEmptyArr(raw) && !hasWorkHistoryRole(values)) {
          errors[field.key] = `${field.label} is required`;
        }
        continue;
      }
      if (formKey === "currentSalary" || formKey === "experienceYears") {
        if (isRequiredNumberMissing(raw)) {
          errors[field.key] = `${field.label} is required`;
        }
        continue;
      }
      if (formKey === "email") {
        if (isEmptyStr(raw) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw))) {
          errors[field.key] = "Invalid email";
        }
        continue;
      }
      if (formKey === "mobile" || field.type === "tel") {
        const m = String(raw ?? "");
        if (!/^[0-9+\-\s]{10,15}$/.test(m)) {
          errors[field.key] = "Invalid mobile";
        }
        continue;
      }
      if (typeof raw === "number") {
        if (Number.isNaN(raw)) errors[field.key] = `${field.label} is required`;
        continue;
      }
      if (isEmptyStr(raw)) {
        errors[field.key] = `${field.label} is required`;
      }
    }
  }

  return errors;
}

export function collectCustomFieldsFromValues(
  values: TeacherFormValues,
  config: ApiTeacherFormConfig
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...(values.customFields ?? {}),
  };
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (apiFieldKeyToFormKey(field.key)) continue;
      const v = values.customFields?.[field.key];
      if (v !== undefined && v !== null && v !== "") {
        out[field.key] = v as string | number | boolean | string[];
      }
    }
  }
  return out;
}
