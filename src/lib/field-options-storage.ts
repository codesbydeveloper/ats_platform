import type { LookupMenuSlug } from "@/config/lookup-menu";
import type { SubCategory } from "@/types/category";
import { uid } from "@/utils/id";

const STORAGE_KEY = "ats-field-options-v1";

export type StoredFieldOption = SubCategory;

type StoreShape = Partial<
  Record<LookupMenuSlug, { options: StoredFieldOption[]; updatedAt: string }>
>;

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function readLocalFieldOptions(slug: LookupMenuSlug): StoredFieldOption[] {
  return readStore()[slug]?.options ?? [];
}

export function writeLocalFieldOptions(
  slug: LookupMenuSlug,
  options: StoredFieldOption[]
) {
  const store = readStore();
  store[slug] = { options, updatedAt: new Date().toISOString() };
  writeStore(store);
}

/** Merge API rows with local-only rows (same name → prefer API id). */
export function mergeFieldOptions(
  apiOptions: StoredFieldOption[],
  localOptions: StoredFieldOption[]
): StoredFieldOption[] {
  const byName = new Map<string, StoredFieldOption>();
  for (const o of apiOptions) {
    const key = o.name.trim().toLowerCase();
    if (key) byName.set(key, o);
  }
  for (const o of localOptions) {
    const key = o.name.trim().toLowerCase();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, o);
  }
  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function addLocalFieldOption(
  slug: LookupMenuSlug,
  name: string
): StoredFieldOption {
  const trimmed = name.trim();
  const existing = readLocalFieldOptions(slug);
  const next: StoredFieldOption = {
    id: uid("field-opt"),
    name: trimmed,
    createdAt: new Date().toISOString(),
  };
  writeLocalFieldOptions(slug, [...existing, next]);
  return next;
}

export function updateLocalFieldOption(
  slug: LookupMenuSlug,
  id: string,
  name: string
) {
  const existing = readLocalFieldOptions(slug);
  writeLocalFieldOptions(
    slug,
    existing.map((o) =>
      o.id === id ? { ...o, name: name.trim() } : o
    )
  );
}

export function removeLocalFieldOption(slug: LookupMenuSlug, id: string) {
  const existing = readLocalFieldOptions(slug);
  writeLocalFieldOptions(
    slug,
    existing.filter((o) => o.id !== id)
  );
}

/** True when the row was created in browser storage (not yet from API). */
export function isLocalOnlyOptionId(id: string): boolean {
  return id.includes("field-opt");
}
