import type { LookupMenuItem } from "@/config/lookup-menu";
import type { Category } from "@/types/category";

export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve the parent category row for a lookup menu entry. */
export function findCategoryForLookup(
  categories: Category[],
  item: LookupMenuItem
): Category | undefined {
  const target = normalizeCategoryName(item.label);
  const exact = categories.find(
    (c) => normalizeCategoryName(c.name) === target
  );
  if (exact) return exact;

  for (const hint of item.match) {
    const h = normalizeCategoryName(hint);
    const found = categories.find((c) => {
      const n = normalizeCategoryName(c.name);
      return n === h || n.includes(h) || h.includes(n);
    });
    if (found) return found;
  }

  return undefined;
}
