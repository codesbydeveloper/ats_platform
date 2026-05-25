import { LOOKUP_MENU_ITEMS, type LookupMenuSlug } from "@/config/lookup-menu";
import { EXPERIENCE_BUCKETS } from "@/data/constants";
import { getAllIndianCities, getIndianStates } from "@/lib/india-locations";
import { findCategoryForLookup } from "@/lib/lookup-category";
import type { Category } from "@/types/category";
import type { TeacherFilters } from "@/store/filter-store";

export type CategoryFilterFieldKey =
  | "subjects"
  | "roles"
  | "grades"
  | "boards"
  | "skills"
  | "states"
  | "cities"
  | "status";

export type TeacherFilterField = CategoryFilterFieldKey | "experience";

export interface ApiCategoryFilterRow {
  categoryId: string;
  label: string;
  options: string[];
  /** Maps to a teacher list filter field; null = show options but cannot apply yet */
  field: TeacherFilterField | null;
}

/** Map a top-level category name from /api/categories/all to a teacher filter field. */
export function resolveTeacherFilterField(
  categoryName: string
): TeacherFilterField | null {
  const n = categoryName.trim().toLowerCase();
  if (n.includes("experience") || n === "exp") {
    return "experience";
  }
  if (n === "subject" || n === "subjects" || n.includes("subject")) {
    return "subjects";
  }
  if (n === "role" || n === "roles" || n.includes("role")) {
    return "roles";
  }
  if (n === "grade" || n === "grades" || n.includes("grade")) {
    return "grades";
  }
  if (n === "board" || n === "boards" || n.includes("board")) {
    return "boards";
  }
  if (
    n === "skill" ||
    n === "skills" ||
    n === "tag" ||
    n === "tags" ||
    n.includes("skill") ||
    n.includes("tag")
  ) {
    return "skills";
  }
  if (n === "state" || n === "states" || n.includes("state")) {
    return "states";
  }
  if (n === "city" || n === "cities" || n.includes("city")) {
    return "cities";
  }
  if (n === "status" || n.includes("status")) {
    return "status";
  }
  return null;
}

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

const STATE_CITY_FALLBACKS: Record<"states" | "cities", string[]> = {
  states: getIndianStates(),
  cities: getAllIndianCities(),
};

const ADVANCED_FILTER_SLUGS: {
  slug: LookupMenuSlug;
  field: "states" | "cities";
  label: string;
}[] = [
  { slug: "state-wise", field: "states", label: "State" },
  { slug: "city-wise", field: "cities", label: "City" },
];

/** Advanced filters drawer: State and City only (from Filter lists + fallbacks). */
export function buildTeacherAdvancedFilters(
  categories: Category[]
): ApiCategoryFilterRow[] {
  const rows: ApiCategoryFilterRow[] = [];

  for (const { slug, field, label } of ADVANCED_FILTER_SLUGS) {
    const item = LOOKUP_MENU_ITEMS.find((i) => i.slug === slug);
    if (!item) continue;

    const cat = findCategoryForLookup(categories, item);
    const apiOptions = namesFromCategory(cat);
    const options =
      apiOptions.length > 0 ? apiOptions : STATE_CITY_FALLBACKS[field];

    if (options.length === 0) continue;

    rows.push({
      categoryId: cat?.id ?? slug,
      label,
      options,
      field,
    });
  }

  return rows;
}

/** One filter dropdown per category from GET /api/categories/all (no static demo lists). */
export function buildApiCategoryFilters(
  categories: Category[]
): ApiCategoryFilterRow[] {
  return categories
    .map((cat) => {
      const options = cat.subcategories
        .map((s) => s.name.trim())
        .filter((name) => name.length > 0);
      const unique = Array.from(new Set(options)).sort((a, b) =>
        a.localeCompare(b)
      );
      return {
        categoryId: cat.id,
        label: cat.name,
        options: unique,
        field: resolveTeacherFilterField(cat.name),
      };
    })
    .filter((row) => row.options.length > 0);
}

export function getTeacherFilterValues(
  filters: TeacherFilters,
  field: string
): string[] {
  return filters.dynamic[field] ?? [];
}

export function patchTeacherFilterValues(
  filters: TeacherFilters,
  field: string,
  values: string[]
): TeacherFilters {
  return {
    ...filters,
    dynamic: { ...filters.dynamic, [field]: values },
  };
}

/** Match experience filter labels from API (e.g. "0-2 years") or legacy bucket labels. */
export function matchesExperienceFilter(
  years: number,
  label: string
): boolean {
  const norm = label
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  for (const bucket of EXPERIENCE_BUCKETS) {
    const bucketNorm = bucket.label
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    if (norm === bucketNorm) {
      return years >= bucket.min && years <= bucket.max;
    }
  }

  const range = /^(\d+)\s*-\s*(\d+)/.exec(norm);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return years >= min && years <= max;
  }

  if (norm.includes("10+") || norm.includes("10 +")) {
    return years >= 11;
  }

  return false;
}
