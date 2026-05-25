import { isPlaceholderValue } from "@/lib/sanitize-api-values";

/** Built-in form keys edited as multiselect but stored as comma-separated strings. */
export const MULTISELECT_STRING_FORM_KEYS = new Set([
  "certifications",
  "subject",
  "areaOfInterest",
]);

function keepParsedToken(token: string): boolean {
  const t = token.trim();
  return Boolean(t) && !isPlaceholderValue(t);
}

export function parseMultiselectStoredValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((s) => s.trim())
      .filter(keepParsedToken);
  }
  if (typeof value === "string" && value.trim()) {
    if (isPlaceholderValue(value)) return [];
    return value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(keepParsedToken);
  }
  return [];
}

export function formatMultiselectStoredValue(values: string[]): string {
  return values.map((s) => s.trim()).filter(Boolean).join(", ");
}

export function multiselectHasValue(value: unknown): boolean {
  return parseMultiselectStoredValue(value).length > 0;
}

/** Prefer primary; fall back to customFields entry (legacy binding). */
export function mergeMultiselectFromCustom(
  primary: string,
  custom: unknown
): string {
  if (primary.trim()) return primary;
  const fromCustom = formatMultiselectStoredValue(
    parseMultiselectStoredValue(custom)
  );
  return fromCustom || primary;
}

/** Parse API/DB values: JSON arrays, string arrays, or comma-separated text. */
export function parseApiStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((s) => s.trim())
      .filter(keepParsedToken);
  }
  if (typeof value === "string" && value.trim()) {
    const t = value.trim();
    if (isPlaceholderValue(t)) return [];
    if (t.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(t);
        if (Array.isArray(parsed)) {
          return parsed
            .map(String)
            .map((s) => s.trim())
            .filter(keepParsedToken);
        }
      } catch {
        /* fall through */
      }
    }
    return parseMultiselectStoredValue(t);
  }
  return [];
}

export function serializeApiStringArray(values: string[]): string {
  return JSON.stringify(
    values.map((s) => s.trim()).filter(Boolean)
  );
}

export function mergeApiStringArrays(...sources: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const src of sources) {
    for (const item of parseApiStringArray(src)) {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
}
