import { LOOKUP_MENU_ITEMS, type LookupMenuSlug } from "@/config/lookup-menu";
import { BOARDS, CITIES, GRADES, ROLES, STATES, SUBJECTS } from "@/data/constants";
import { findCategoryForLookup } from "@/lib/lookup-category";
import { listAllCategoriesRequest } from "@/lib/categories-api";
import { apiFieldKeyToFormKey } from "@/lib/teacher-form-field-map";
import type { Category } from "@/types/category";
import type { ApiTeacherFormField } from "@/types/teacher-form-api";

export type TeacherFormOptionsMap = {
  states: string[];
  citiesByState: Record<string, string[]>;
  allCities: string[];
  bySlug: Partial<Record<LookupMenuSlug, string[]>>;
};

const EMPTY_OPTIONS: TeacherFormOptionsMap = {
  states: [...STATES],
  citiesByState: { ...CITIES },
  allCities: Array.from(new Set(Object.values(CITIES).flat())).sort((a, b) =>
    a.localeCompare(b)
  ),
  bySlug: {},
};

const FIELD_KEY_TO_SLUG: Record<string, LookupMenuSlug> = {
  state: "state-wise",
  city: "city-wise",
  subject: "subjects-taught",
  subject_taught: "subjects-taught",
  boards: "boards-taught",
  boards_taught: "boards-taught",
  grades: "grades-taught",
  grades_taught: "grades-taught",
  roles: "teacher-roles",
  teacher_roles: "teacher-roles",
  qualification: "educational-qualification",
  certifications: "qualification-certification",
  area_of_interest: "area-of-interest",
  areaOfInterest: "area-of-interest",
};

function namesFromCategory(cat: Category | undefined): string[] {
  if (!cat) return [];
  return Array.from(
    new Set(
      cat.subcategories
        .map((s) => s.name.trim())
        .filter((n) => n.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
}

/** Build dropdown/chip options from GET /api/categories/all with static fallbacks. */
export function buildTeacherFormOptions(
  categories: Category[]
): TeacherFormOptionsMap {
  const bySlug: Partial<Record<LookupMenuSlug, string[]>> = {};

  for (const item of LOOKUP_MENU_ITEMS) {
    const cat = findCategoryForLookup(categories, item);
    const names = namesFromCategory(cat);
    if (names.length > 0) {
      bySlug[item.slug] = names;
    }
  }

  const states =
    bySlug["state-wise"]?.length ? bySlug["state-wise"]! : [...STATES];

  const citiesByState: Record<string, string[]> = { ...CITIES };
  const apiCities = bySlug["city-wise"];
  if (apiCities?.length) {
    for (const state of states) {
      if (!citiesByState[state]?.length) {
        citiesByState[state] = apiCities;
      }
    }
  }

  const allCities = Array.from(
    new Set([
      ...Object.values(citiesByState).flat(),
      ...(apiCities ?? []),
    ])
  ).sort((a, b) => a.localeCompare(b));

  if (!bySlug["subjects-taught"]?.length) {
    bySlug["subjects-taught"] = [...SUBJECTS];
  }
  if (!bySlug["boards-taught"]?.length) {
    bySlug["boards-taught"] = [...BOARDS];
  }
  if (!bySlug["grades-taught"]?.length) {
    bySlug["grades-taught"] = [...GRADES];
  }
  if (!bySlug["teacher-roles"]?.length) {
    bySlug["teacher-roles"] = [...ROLES];
  }

  return { states, citiesByState, allCities, bySlug };
}

export function getEmptyTeacherFormOptions(): TeacherFormOptionsMap {
  return {
    states: [...EMPTY_OPTIONS.states],
    citiesByState: { ...EMPTY_OPTIONS.citiesByState },
    allCities: [...EMPTY_OPTIONS.allCities],
    bySlug: {
      "subjects-taught": [...SUBJECTS],
      "boards-taught": [...BOARDS],
      "grades-taught": [...GRADES],
      "teacher-roles": [...ROLES],
    },
  };
}

export async function fetchTeacherFormOptions(
  accessToken: string | null
): Promise<TeacherFormOptionsMap> {
  const result = await listAllCategoriesRequest(accessToken);
  if (!result.ok) {
    return getEmptyTeacherFormOptions();
  }
  return buildTeacherFormOptions(result.categories);
}

/** Options for a select/multiselect field (API field.options → categories → constants). */
export function resolveFieldOptions(
  field: ApiTeacherFormField,
  formOptions: TeacherFormOptionsMap,
  selectedState?: string
): string[] {
  if (field.options && field.options.length > 0) {
    return field.options;
  }

  const formKey = apiFieldKeyToFormKey(field.key);
  const slug =
    FIELD_KEY_TO_SLUG[field.key] ??
    (formKey ? FIELD_KEY_TO_SLUG[formKey] : undefined);

  if (formKey === "state" || field.key === "state") {
    return formOptions.states;
  }

  if (formKey === "city" || field.key === "city") {
    if (selectedState?.trim()) {
      const forState = formOptions.citiesByState[selectedState];
      if (forState?.length) return forState;
    }
    return formOptions.allCities;
  }

  if (slug && formOptions.bySlug[slug]?.length) {
    return formOptions.bySlug[slug]!;
  }

  if (formKey === "subject") return formOptions.bySlug["subjects-taught"] ?? [...SUBJECTS];
  if (formKey === "boards") return formOptions.bySlug["boards-taught"] ?? [...BOARDS];
  if (formKey === "grades") return formOptions.bySlug["grades-taught"] ?? [...GRADES];
  if (formKey === "roles") return formOptions.bySlug["teacher-roles"] ?? [...ROLES];

  return [];
}
