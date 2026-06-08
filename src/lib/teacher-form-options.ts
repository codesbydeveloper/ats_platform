import { LOOKUP_MENU_ITEMS, type LookupMenuSlug } from "@/config/lookup-menu";
import { BOARDS, GRADES, ROLES, SUBJECTS } from "@/data/constants";
import {
  getAllIndianCities,
  getIndianCitiesByState,
  getIndianStates,
} from "@/lib/india-locations";
import {
  getCityNamesForState,
  getCountryNames,
  getStateNamesForCountry,
} from "@/lib/locations";
import { findCategoryForLookup } from "@/lib/lookup-category";
import { listAllCategoriesRequest } from "@/lib/categories-api";
import { getTeacherFormRequest } from "@/lib/teacher-form-api";
import { apiFieldKeyToFormKey } from "@/lib/teacher-form-field-map";
import type { Category } from "@/types/category";
import {
  findTeacherFormFieldForLookupSlug,
  getSelectMultiselectFields,
  LOOKUP_SLUG_TO_FIELD_KEY,
} from "@/lib/teacher-form-select-fields";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
} from "@/types/teacher-form-api";

export type TeacherFormOptionsMap = {
  states: string[];
  citiesByState: Record<string, string[]>;
  allCities: string[];
  bySlug: Partial<Record<LookupMenuSlug, string[]>>;
};

const EMPTY_OPTIONS: TeacherFormOptionsMap = {
  states: getIndianStates(),
  citiesByState: getIndianCitiesByState(),
  allCities: getAllIndianCities(),
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
    bySlug["state-wise"]?.length ? bySlug["state-wise"]! : getIndianStates();

  const citiesByState: Record<string, string[]> = getIndianCitiesByState();
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
  const [catResult, formResult] = await Promise.all([
    listAllCategoriesRequest(accessToken),
    getTeacherFormRequest(accessToken),
  ]);
  const base = catResult.ok
    ? buildTeacherFormOptions(catResult.categories)
    : getEmptyTeacherFormOptions();
  if (formResult.ok && formResult.data.sections.length > 0) {
    return mergeTeacherFormConfigOptions(formResult.data, base);
  }
  return base;
}

/** Overlay select/multiselect `options` from GET /api/teacher-form onto form dropdowns. */
export function mergeTeacherFormConfigOptions(
  config: ApiTeacherFormConfig,
  base: TeacherFormOptionsMap
): TeacherFormOptionsMap {
  const bySlug: Partial<Record<LookupMenuSlug, string[]>> = {
    ...base.bySlug,
  };

  for (const slug of Object.keys(LOOKUP_SLUG_TO_FIELD_KEY) as LookupMenuSlug[]) {
    const field = findTeacherFormFieldForLookupSlug(config, slug);
    if (field?.options?.length) {
      bySlug[slug] = field.options;
    }
  }

  let states = base.states;
  const stateField = findTeacherFormFieldForLookupSlug(config, "state-wise");
  if (stateField?.options?.length) {
    states = stateField.options;
  }

  const citiesByState = { ...base.citiesByState };
  const cityField = findTeacherFormFieldForLookupSlug(config, "city-wise");
  if (cityField?.options?.length) {
    for (const state of states) {
      if (!citiesByState[state]?.length) {
        citiesByState[state] = cityField.options;
      }
    }
  }

  const allCities = Array.from(
    new Set([
      ...Object.values(citiesByState).flat(),
      ...(cityField?.options ?? []),
    ])
  ).sort((a, b) => a.localeCompare(b));

  return { states, citiesByState, allCities, bySlug };
}

export { getSelectMultiselectFields };

/** Options for a select/multiselect field (API field.options → categories → constants). */
export type LocationSelectContext = {
  selectedCountry?: string;
  selectedState?: string;
};

export function resolveFieldOptions(
  field: ApiTeacherFormField,
  formOptions: TeacherFormOptionsMap,
  location?: LocationSelectContext
): string[] {
  const selectedCountry = location?.selectedCountry;
  const selectedState = location?.selectedState;

  const formKey = apiFieldKeyToFormKey(field.key);
  const wantsAllIndianCities =
    formKey === "currentLocation" ||
    formKey === "preferredLocation" ||
    field.key === "current_location" ||
    field.key === "preferred_location";

  // Current/Preferred location should always be the full India cities/towns list
  // from the package dataset (not from API-provided options).
  if (wantsAllIndianCities) {
    return getAllIndianCities();
  }

  if (field.options && field.options.length > 0) {
    return field.options;
  }

  const slug =
    FIELD_KEY_TO_SLUG[field.key] ??
    (formKey ? FIELD_KEY_TO_SLUG[formKey] : undefined);

  if (formKey === "country" || field.key === "country") {
    return getCountryNames();
  }

  if (formKey === "state" || field.key === "state") {
    if (selectedCountry?.trim()) {
      const fromPackage = getStateNamesForCountry(selectedCountry);
      if (fromPackage.length) return fromPackage;
    }
    return formOptions.states;
  }

  if (formKey === "city" || field.key === "city") {
    if (!selectedState?.trim()) return [];
    if (selectedCountry?.trim()) {
      const fromPackage = getCityNamesForState(selectedCountry, selectedState);
      if (fromPackage.length) return fromPackage;
    }
    const forState = formOptions.citiesByState[selectedState];
    return forState?.length ? forState : [];
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
