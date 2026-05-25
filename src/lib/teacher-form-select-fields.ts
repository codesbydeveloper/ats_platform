import { getLookupMenuItem, type LookupMenuSlug } from "@/config/lookup-menu";
import type { LookupFieldOption } from "@/lib/categories-api";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
} from "@/types/teacher-form-api";

/** Lookup menu slug → field `key` on GET /api/teacher-form. */
export const LOOKUP_SLUG_TO_FIELD_KEY: Record<LookupMenuSlug, string> = {
  "educational-qualification": "qualification",
  "qualification-certification": "certifications",
  "subjects-taught": "subject_taught",
  "boards-taught": "boards_taught",
  "grades-taught": "grades_taught",
  "state-wise": "state",
  "city-wise": "city",
  "area-of-interest": "area_of_interest",
  "teacher-roles": "role",
};

function normalizeLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSelectOrMultiselectField(
  field: ApiTeacherFormField
): boolean {
  return field.type === "select" || field.type === "multiselect";
}

/** All select / multiselect fields from teacher-form config. */
export function getSelectMultiselectFields(
  config: ApiTeacherFormConfig
): ApiTeacherFormField[] {
  const out: ApiTeacherFormField[] = [];
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (isSelectOrMultiselectField(field)) {
        out.push(field);
      }
    }
  }
  return out.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.label.localeCompare(b.label)
  );
}

/** Resolve one lookup slug to a teacher-form field (key, then label). */
export function findTeacherFormFieldForLookupSlug(
  config: ApiTeacherFormConfig,
  slug: LookupMenuSlug
): ApiTeacherFormField | undefined {
  const expectedKey = LOOKUP_SLUG_TO_FIELD_KEY[slug];
  const menu = getLookupMenuItem(slug);
  const targetLabel = menu ? normalizeLabel(menu.label) : "";

  for (const section of config.sections) {
    for (const field of section.fields) {
      if (!isSelectOrMultiselectField(field)) continue;
      if (field.key === expectedKey) return field;
    }
  }

  if (menu) {
    for (const section of config.sections) {
      for (const field of section.fields) {
        if (!isSelectOrMultiselectField(field)) continue;
        if (normalizeLabel(field.label) === targetLabel) return field;
        for (const hint of menu.match) {
          const h = normalizeLabel(hint);
          const n = normalizeLabel(field.label);
          if (n.includes(h) || h.includes(n)) return field;
        }
      }
    }
  }

  return undefined;
}

export type TeacherFormLookupOptionsResult = {
  field: ApiTeacherFormField;
  options: LookupFieldOption[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/** Paginated option rows from `field.options` on teacher-form. */
export function listTeacherFormFieldOptions(
  config: ApiTeacherFormConfig,
  slug: LookupMenuSlug,
  page = 1,
  limit = 10,
  search = ""
): TeacherFormLookupOptionsResult | null {
  const field = findTeacherFormFieldForLookupSlug(config, slug);
  if (!field) return null;

  const q = search.trim().toLowerCase();
  const allNames = (field.options ?? []).filter(Boolean);
  const filtered = q
    ? allNames.filter((name) => name.toLowerCase().includes(q))
    : allNames;

  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const start = (safePage - 1) * safeLimit;
  const slice = filtered.slice(start, start + safeLimit);

  const options: LookupFieldOption[] = slice.map((name, i) => ({
    id: `${field.key}-${start + i}`,
    name,
    value: name,
  }));

  return {
    field,
    options,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}
