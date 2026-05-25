import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import type { ApiTeacherFormConfig } from "@/types/teacher-form-api";

/** API snake_case keys → react-hook-form camelCase keys. */
const API_KEY_TO_FORM: Record<string, keyof TeacherFormValues | "workHistory"> =
  {
    name: "name",
    mobile: "mobile",
    email: "email",
    country: "country",
    state: "state",
    city: "city",
    address: "address",
    status: "status",
    ug_college: "ugCollege",
    pg_university: "pgUniversity",
    qualification: "qualification",
    certifications: "certifications",
    subject: "subject",
    subject_taught: "subject",
    subjects_taught: "subject",
    boards: "boards",
    boards_taught: "boards",
    grades: "grades",
    grades_taught: "grades",
    role: "roles",
    roles: "roles",
    teacher_roles: "roles",
    current_location: "currentLocation",
    preferred_location: "preferredLocation",
    area_of_interest: "areaOfInterest",
    salary: "currentSalary",
    current_salary: "currentSalary",
    total_years_experience: "experienceYears",
    total_experience: "experienceYears",
    experience_years: "experienceYears",
    internal_notes: "notes",
    notes: "notes",
    skills: "skills",
    additional_education: "extraEducation",
    extra_education: "extraEducation",
    education_extras: "extraEducation",
    work_experience: "workHistory",
    work_history: "workHistory",
  };

const FORM_KEY_TO_API: Record<string, string> = {
  ugCollege: "ug_college",
  pgUniversity: "pg_university",
  subject: "subjects_taught",
  boards: "boards_taught",
  grades: "grades_taught",
  roles: "teacher_roles",
  currentLocation: "current_location",
  preferredLocation: "preferred_location",
  areaOfInterest: "area_of_interest",
  currentSalary: "current_salary",
  experienceYears: "total_experience",
  notes: "internal_notes",
};

const BUILTIN_FORM_KEYS = new Set<string>([
  "name",
  "mobile",
  "email",
  "country",
  "state",
  "city",
  "address",
  "status",
  "ugCollege",
  "pgUniversity",
  "qualification",
  "certifications",
  "subject",
  "boards",
  "grades",
  "roles",
  "currentLocation",
  "preferredLocation",
  "areaOfInterest",
  "currentSalary",
  "experienceYears",
  "notes",
  "skills",
  "workHistory",
  "extraEducation",
  "resumeFileName",
  "resumeMime",
]);

export function apiFieldKeyToFormKey(
  apiKey: string
): keyof TeacherFormValues | "workHistory" | null {
  if (apiKey === "work_experience") return "workHistory";
  const mapped = API_KEY_TO_FORM[apiKey];
  if (mapped) return mapped;
  if (BUILTIN_FORM_KEYS.has(apiKey)) {
    return apiKey as keyof TeacherFormValues;
  }
  return null;
}

export function formKeyToApiKey(formKey: string): string {
  return FORM_KEY_TO_API[formKey] ?? formKey;
}

export function isBuiltinApiFieldKey(apiKey: string): boolean {
  return apiFieldKeyToFormKey(apiKey) != null;
}

export function isCustomApiField(config: ApiTeacherFormConfig, apiKey: string): boolean {
  if (isBuiltinApiFieldKey(apiKey)) return false;
  if (apiKey === "work_experience") return false;
  return config.sections.some((s) => s.fields.some((f) => f.key === apiKey));
}

export { BUILTIN_FORM_KEYS };
