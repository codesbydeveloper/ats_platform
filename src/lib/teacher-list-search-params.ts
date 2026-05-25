import type { TeacherFilters } from "@/store/filter-store";
import { isPlaceholderValue, sanitizeApiText } from "@/lib/sanitize-api-values";

/**
 * Form-builder / category filter keys → GET /api/teachers query param names.
 * Multiselect values repeat the same key: `&board=CBSE&board=IB`.
 */
const FILTER_KEY_TO_API_PARAM: Record<string, string> = {
  state: "state",
  city: "city",
  country: "country",
  email: "email",
  mobile: "mobile",
  phone: "mobile",
  subject: "subjects_taught",
  subject_taught: "subjects_taught",
  subjects_taught: "subjects_taught",
  qualification: "qualification",
  boards: "board",
  board: "board",
  boards_taught: "board",
  grades: "grade",
  grade: "grade",
  grades_taught: "grade",
  role: "role",
  roles: "role",
  teacher_roles: "role",
  area_of_interest: "area",
  area: "area",
  reason_to_join: "reason_to_join",
  preferred_location: "preferred_location",
  current_location: "current_location",
  ug_college: "ug",
  pg_university: "pg",
  certifications: "certification",
  certification: "certification",
  name: "name",
  notes: "notes",
  internal_notes: "notes",
  status: "status",
  skills: "skills",
};

function cleanFilterValues(values: string[]): string[] {
  return values.map((v) => sanitizeApiText(v)).filter(Boolean);
}

/** Append advanced-search filters to `GET /api/teachers` query string. */
export function appendTeacherListSearchParams(
  params: URLSearchParams,
  filters: TeacherFilters
): void {
  const q = sanitizeApiText(filters.search);
  if (q) {
    params.set("q", q);
  }

  for (const [key, rawValues] of Object.entries(filters.dynamic)) {
    const values = cleanFilterValues(rawValues);
    if (!values.length) continue;

    const apiParam = FILTER_KEY_TO_API_PARAM[key] ?? key;

    if (apiParam === "subjects_taught" && values.length === 1) {
      params.append("subjects_taught", values[0]!);
      params.append("subject", values[0]!);
      continue;
    }

    if (apiParam === "area" && values.length === 1) {
      params.append("area", values[0]!);
      params.append("area_of_interest", values[0]!);
      continue;
    }

    for (const v of values) {
      if (!isPlaceholderValue(v)) {
        params.append(apiParam, v);
      }
    }
  }
}

export function cloneTeacherFilters(filters: TeacherFilters): TeacherFilters {
  const dynamic: TeacherFilters["dynamic"] = {};
  for (const [k, v] of Object.entries(filters.dynamic)) {
    dynamic[k] = [...v];
  }
  return { search: filters.search, dynamic };
}

export function teacherFiltersAreEmpty(filters: TeacherFilters): boolean {
  if (sanitizeApiText(filters.search)) return false;
  return !Object.values(filters.dynamic).some((values) =>
    cleanFilterValues(values).length > 0
  );
}
