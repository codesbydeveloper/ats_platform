import { parseApiStringArray } from "@/lib/multiselect-form-value";
import {
  DEFAULT_COUNTRY_NAME,
  getCityNamesForState,
  getCountryNames,
  getStateNamesForCountry,
} from "@/lib/locations";
import type { Teacher } from "@/types/teacher";

export type CategoryFilterFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "boolean";

export type CategoryFilterField = {
  id: string;
  label: string;
  key: string;
  type: CategoryFilterFieldType;
  options: string[];
  sectionTitle?: string;
  sortOrder: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function extractCategoriesArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  if (!root) return [];
  const nested = root.categories ?? root.data ?? root.items;
  if (Array.isArray(nested)) return nested;
  const inner = asRecord(nested);
  if (inner && Array.isArray(inner.categories)) return inner.categories;
  return [];
}

function normalizeType(raw: unknown): CategoryFilterFieldType {
  const t = String(raw ?? "text").toLowerCase();
  if (
    t === "select" ||
    t === "multiselect" ||
    t === "boolean" ||
    t === "date" ||
    t === "number" ||
    t === "email" ||
    t === "tel" ||
    t === "textarea"
  ) {
    return t;
  }
  return "text";
}

function isFilterEnabled(raw: Record<string, unknown>): boolean {
  const f = raw.filter;
  return f === 1 || f === true || f === "1";
}

/** GET /api/categories/all — fields with `filter: 1` for the advanced filters drawer. */
export function normalizeCategoryFilterFields(data: unknown): CategoryFilterField[] {
  return extractCategoriesArray(data)
    .map((n) => asRecord(n))
    .filter((r): r is Record<string, unknown> => r != null && isFilterEnabled(r))
    .map((r) => {
      const optionsRaw = r.options ?? r.choices;
      const options = Array.isArray(optionsRaw)
        ? optionsRaw.map(String).filter((o) => o.trim().length > 0)
        : [];
      return {
        id: String(r.id ?? r.key ?? ""),
        label: String(r.name ?? r.label ?? "Field"),
        key: String(r.key ?? r.mapsTo ?? r.id ?? ""),
        type: normalizeType(r.type),
        options,
        sectionTitle:
          r.section_title != null
            ? String(r.section_title)
            : r.sectionTitle != null
              ? String(r.sectionTitle)
              : undefined,
        sortOrder:
          typeof r.sortOrder === "number"
            ? r.sortOrder
            : typeof r.sort_order === "number"
              ? r.sort_order
              : 0,
      };
    })
    .filter((f) => f.key.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isMultiValueFilterType(type: CategoryFilterFieldType): boolean {
  return type === "multiselect";
}

export function filterSearchPlaceholder(label: string): string {
  return `Search By ${label}`;
}

/**
 * Advanced search 3-column grid (row-major).
 * Col1: UG college → PG university → state → city → area of interest
 * Col2: notes → qualification → role → boards
 * Col3: name → certifications → subject → country
 * API fields not listed here are appended at the end (by sortOrder).
 */
/** Always available in advanced search (merged with API filter fields). */
export const BUILTIN_ADVANCED_SEARCH_FIELDS: CategoryFilterField[] = [
  {
    id: "builtin-filter-email",
    label: "Email",
    key: "email",
    type: "email",
    options: [],
    sortOrder: 0,
  },
  {
    id: "builtin-filter-mobile",
    label: "Mobile",
    key: "mobile",
    type: "tel",
    options: [],
    sortOrder: 0,
  },
  {
    id: "builtin-filter-country",
    label: "Country",
    key: "country",
    type: "select",
    options: [],
    sortOrder: 0,
  },
];

export function mergeAdvancedSearchFilterFields(
  apiFields: CategoryFilterField[]
): CategoryFilterField[] {
  const byKey = new Map(apiFields.map((f) => [f.key, f]));
  for (const builtin of BUILTIN_ADVANCED_SEARCH_FIELDS) {
    if (!byKey.has(builtin.key)) {
      byKey.set(builtin.key, builtin);
    }
  }
  return orderFilterFieldsForAdvancedSearch([...byKey.values()]);
}

export const ADVANCED_SEARCH_GRID_ORDER: readonly string[] = [
  "name",
  "email",
  "mobile",
  "country",
  "state",
  "city",
  "subject_taught",
  "qualification",
  "boards_taught",
  "grades_taught",
  "certifications",
  "area_of_interest",
  "role",
  "preferred_location",
  "reason_to_join",
  "ug_college",
  "pg_university",
  "notes",
];

export function orderFilterFieldsForAdvancedSearch(
  fields: CategoryFilterField[]
): CategoryFilterField[] {
  const indexByKey = new Map(
    ADVANCED_SEARCH_GRID_ORDER.map((key, index) => [key, index])
  );

  return [...fields].sort((a, b) => {
    const ai = indexByKey.get(a.key);
    const bi = indexByKey.get(b.key);
    const aKnown = ai !== undefined;
    const bKnown = bi !== undefined;

    if (aKnown && bKnown) return ai - bi;
    if (aKnown && !bKnown) return -1;
    if (!aKnown && bKnown) return 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  });
}

export type FilterOptionsContext = {
  country?: string;
  state?: string;
};

export function resolveFilterFieldOptions(
  field: CategoryFilterField,
  context: FilterOptionsContext = {}
): string[] {
  if (field.options.length > 0) {
    return field.options;
  }

  const country = context.country?.trim() || DEFAULT_COUNTRY_NAME;

  if (field.key === "country") {
    return getCountryNames();
  }
  if (field.key === "state") {
    return getStateNamesForCountry(country);
  }
  if (field.key === "city") {
    const state = context.state?.trim();
    if (!state) return [];
    return getCityNamesForState(country, state);
  }

  return [];
}

/** Dropdown-style filter cell (legacy ATS grid). */
export function usesDropdownFilterControl(
  field: CategoryFilterField,
  options: string[]
): boolean {
  if (field.type === "multiselect" || field.type === "select" || field.type === "boolean") {
    return true;
  }
  if (options.length > 0) return true;
  if (field.key === "state" || field.key === "city" || field.key === "country") {
    return true;
  }
  return false;
}

const TEACHER_FIELD_GETTERS: Record<string, (t: Teacher) => string | string[]> = {
  name: (t) => t.name,
  mobile: (t) => t.mobile,
  email: (t) => t.email,
  country: (t) => t.country,
  state: (t) => t.state,
  city: (t) => t.city,
  address: (t) => t.address,
  status: (t) => t.status,
  subject: (t) => t.subject,
  subject_taught: (t) => t.subject,
  boards_taught: (t) => t.boards,
  role: (t) => t.roles,
  teacher_roles: (t) => t.roles,
  reason_to_join: (t) =>
    parseApiStringArray(t.customFields?.reason_to_join).join(", "),
  where_did_you_hear_about_us: (t) =>
    parseApiStringArray(t.customFields?.where_did_you_hear_about_us).join(
      ", "
    ),
  ug_college: (t) => t.ugCollege,
  pg_university: (t) => t.pgUniversity,
  qualification: (t) => t.qualification,
  certifications: (t) => t.certifications,
  current_location: (t) => t.currentLocation,
  preferred_location: (t) => t.preferredLocation,
  area_of_interest: (t) =>
    parseApiStringArray(t.areaOfInterest).join(", ") || t.areaOfInterest,
  internal_notes: (t) => t.notes,
  notes: (t) => t.notes,
};

export function getTeacherValueForFilterKey(
  teacher: Teacher,
  key: string
): string | string[] {
  const getter = TEACHER_FIELD_GETTERS[key] ?? TEACHER_FIELD_GETTERS[key.toLowerCase()];
  if (getter) return getter(teacher);

  const custom = teacher.customFields?.[key];
  if (Array.isArray(custom)) {
    return custom.map(String);
  }
  if (custom != null && String(custom).trim() !== "") {
    return String(custom);
  }
  return "";
}

function valueTokens(raw: string | string[]): string[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((v) =>
      String(v)
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return String(raw)
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function teacherMatchesDynamicFilter(
  teacher: Teacher,
  key: string,
  selected: string[]
): boolean {
  if (!selected.length) return true;
  const raw = getTeacherValueForFilterKey(teacher, key);
  const tokens = valueTokens(raw);
  if (!tokens.length) return false;

  return selected.some((sel) => {
    const s = sel.trim().toLowerCase();
    return tokens.some((t) => t === s || t.includes(s));
  });
}

export function appendDynamicFilterParams(
  params: URLSearchParams,
  dynamic: Record<string, string[]>
): void {
  for (const [key, values] of Object.entries(dynamic)) {
    for (const v of values) {
      if (v.trim()) params.append(key, v.trim());
    }
  }
}
