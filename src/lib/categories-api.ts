import { mapApiRowToTeacher } from "@/lib/teachers-api";
import type { Category, SubCategory } from "@/types/category";
import type { Teacher } from "@/types/teacher";

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "https://ats.raomtech.com";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function authHeaders(accessToken: string | null): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    h.Authorization = `Bearer ${accessToken}`;
  }
  return h;
}

function apiErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return `Request failed (${status})`;
  }
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string") return d.message;
  if (Array.isArray(d.message)) return d.message.map(String).join(", ");
  if (typeof d.error === "string") return d.error;
  if (typeof d.detail === "string") return d.detail;
  return `Request failed (${status})`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function pickChildren(node: Record<string, unknown>): unknown[] {
  const c =
    node.children ??
    node.subcategories ??
    node.sub_categories ??
    node.subCategories ??
    node.sub_items;
  return Array.isArray(c) ? c : [];
}

function mapSubRow(row: Record<string, unknown>): SubCategory {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "Untitled"),
    createdAt: String(
      row.createdAt ?? row.created_at ?? new Date().toISOString()
    ),
  };
}

/** Map nested API children (all levels) into a flat subcategory list for the UI. */
function flattenChildNodes(nodes: unknown[]): SubCategory[] {
  const out: SubCategory[] = [];
  for (const raw of nodes) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = String(row.id ?? "");
    if (id) {
      out.push(mapSubRow(row));
    }
    const nested = pickChildren(row);
    if (nested.length > 0) {
      out.push(...flattenChildNodes(nested));
    }
  }
  return out;
}

function mapCategoryNode(node: Record<string, unknown>): Category {
  const subsRaw = pickChildren(node);
  const subcategories = flattenChildNodes(subsRaw);

  return {
    id: String(node.id ?? ""),
    name: String(node.name ?? node.category_name ?? "Untitled"),
    createdAt: String(
      node.createdAt ?? node.created_at ?? new Date().toISOString()
    ),
    subcategories,
  };
}

function extractCategoriesArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  if (!root) return [];

  const nested =
    root.categories ?? root.data ?? root.items ?? root.results;
  if (Array.isArray(nested)) return nested;

  const inner = asRecord(nested);
  if (inner && Array.isArray(inner.categories)) return inner.categories;

  return [];
}

export function normalizeCategoriesList(data: unknown): Category[] {
  return extractCategoriesArray(data)
    .map((n) => asRecord(n))
    .filter(Boolean)
    .map((r) => mapCategoryNode(r!));
}

export type CategoriesPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  count: number;
};

function parsePagination(
  root: Record<string, unknown>,
  page: number,
  limit: number,
  categoriesLength: number
): CategoriesPagination {
  const total = Number(root.total ?? categoriesLength);
  const totalPages = Math.max(
    1,
    Number(root.total_pages ?? (Math.ceil(total / limit) || 1))
  );
  return {
    page: Number(root.page ?? page),
    limit: Number(root.limit ?? limit),
    total,
    totalPages,
    hasNextPage: Boolean(root.has_next_page ?? page < totalPages),
    hasPrevPage: Boolean(root.has_prev_page ?? page > 1),
    count: Number(root.count ?? categoriesLength),
  };
}

export type ListCategoriesResult =
  | { ok: true; categories: Category[]; pagination: CategoriesPagination }
  | { ok: false; message: string };

/**
 * GET /api/categories?page=&limit=
 * Pagination applies to top-level categories; each row includes nested children.
 */
export async function listCategoriesRequest(
  accessToken: string | null,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT
): Promise<ListCategoriesResult> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
  const params = new URLSearchParams({
    page: String(safePage),
    limit: String(safeLimit),
  });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/categories?${params}`, {
      headers: authHeaders(accessToken),
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  const root = asRecord(data) ?? {};
  const categories = normalizeCategoriesList(data);
  const pagination = parsePagination(root, safePage, safeLimit, categories.length);

  return { ok: true, categories, pagination };
}

export type ListAllCategoriesResult =
  | { ok: true; categories: Category[] }
  | { ok: false; message: string };

export type LookupFieldOption = {
  id: string;
  name: string;
  value?: string;
  teacher_id?: number;
  teacher_name?: string;
  teacher_count?: number;
  createdAt?: string;
};

export type LookupFieldOptionsPagination = CategoriesPagination & {
  slug: string;
  field: string;
  parent: { id: string; name: string } | null;
};

export type ListLookupFieldOptionsResult =
  | {
      ok: true;
      options: LookupFieldOption[];
      pagination: LookupFieldOptionsPagination;
    }
  | { ok: false; message: string };

/**
 * GET /api/categories/lookup/:slug/options?page=&limit=&q=
 * Only sub-options for one field (Educational Qualification, Boards Taught, etc.).
 */
export async function listLookupFieldOptionsRequest(
  accessToken: string | null,
  slug: string,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search = ""
): Promise<ListLookupFieldOptionsResult> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
  const params = new URLSearchParams({
    page: String(safePage),
    limit: String(safeLimit),
  });
  const q = search.trim();
  if (q) params.set("q", q);

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/categories/lookup/${encodeURIComponent(slug)}/options?${params}`,
      { headers: authHeaders(accessToken) }
    );
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  const root = asRecord(data) ?? {};
  const rawOpts = Array.isArray(root.options) ? root.options : [];
  const options: LookupFieldOption[] = rawOpts
    .map((n) => asRecord(n))
    .filter(Boolean)
    .map((r) => ({
      id: String(r!.id ?? r!.teacher_id ?? r!.name ?? ""),
      name: String(r!.name ?? r!.value ?? "Untitled"),
      value: r!.value != null ? String(r!.value) : String(r!.name ?? ""),
      teacher_id:
        r!.teacher_id != null ? Number(r!.teacher_id) : undefined,
      teacher_name:
        r!.teacher_name != null ? String(r!.teacher_name) : undefined,
      teacher_count:
        r!.teacher_count != null ? Number(r!.teacher_count) : undefined,
      createdAt:
        r!.createdAt != null || r!.created_at != null
          ? String(r!.createdAt ?? r!.created_at)
          : undefined,
    }))
    .filter((o) => o.name);

  const parentRec = asRecord(root.parent);
  const parent =
    parentRec && parentRec.id != null
      ? {
          id: String(parentRec.id),
          name: String(parentRec.name ?? ""),
        }
      : null;

  const total = Number(root.total ?? options.length);
  const totalPages = Math.max(
    1,
    Number(root.total_pages ?? (Math.ceil(total / safeLimit) || 1))
  );

  return {
    ok: true,
    options,
    pagination: {
      slug: String(root.slug ?? slug),
      field: String(root.field ?? slug),
      parent,
      page: Number(root.page ?? safePage),
      limit: Number(root.limit ?? safeLimit),
      total,
      totalPages,
      hasNextPage: Boolean(root.has_next_page ?? safePage < totalPages),
      hasPrevPage: Boolean(root.has_prev_page ?? safePage > 1),
      count: Number(root.count ?? options.length),
    },
  };
}

export type ListLookupFieldTeachersResult =
  | {
      ok: true;
      teachers: Teacher[];
      value: string;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    }
  | { ok: false; message: string };

/** GET /api/categories/lookup/:slug/teachers?value=&page=&limit= */
export async function listLookupFieldTeachersRequest(
  accessToken: string | null,
  slug: string,
  value: string,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  teacherId?: string | number | null
): Promise<ListLookupFieldTeachersResult> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
  const params = new URLSearchParams({
    page: String(safePage),
    limit: String(safeLimit),
  });
  if (teacherId != null && String(teacherId).trim() !== "") {
    params.set("teacher_id", String(teacherId));
  } else {
    params.set("value", value.trim());
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/categories/lookup/${encodeURIComponent(slug)}/teachers?${params}`,
      { headers: authHeaders(accessToken) }
    );
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  const root = asRecord(data) ?? {};
  const rawList = Array.isArray(root.teachers) ? root.teachers : [];
  const teachers = rawList
    .map(mapApiRowToTeacher)
    .filter((t): t is Teacher => t != null);

  const total = Number(root.total ?? teachers.length);
  const totalPages = Math.max(
    1,
    Number(root.total_pages ?? (Math.ceil(total / safeLimit) || 1))
  );

  return {
    ok: true,
    teachers,
    value: String(root.value ?? value),
    total,
    page: Number(root.page ?? safePage),
    limit: Number(root.limit ?? safeLimit),
    totalPages,
    hasNextPage: Boolean(root.has_next_page ?? safePage < totalPages),
    hasPrevPage: Boolean(root.has_prev_page ?? safePage > 1),
  };
}

/** GET /api/categories/all — full tree for filters, dropdowns, etc. */
export async function listAllCategoriesRequest(
  accessToken: string | null
): Promise<ListAllCategoriesResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/categories/all`, {
      headers: authHeaders(accessToken),
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  return { ok: true, categories: normalizeCategoriesList(data) };
}

export type CreateCategoryResult =
  | { ok: true; id: string; raw: unknown }
  | { ok: false; message: string };

/**
 * POST /api/categories — category + optional sub_items in one request.
 * Body: { name, sub_items: string[] } (empty strings skipped by the server).
 */
export async function createCategoryRequest(
  accessToken: string | null,
  name: string,
  subItems: string[] = []
): Promise<CreateCategoryResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, message: "Category name is required." };
  }

  const body: Record<string, unknown> = { name: trimmedName };
  if (subItems.length > 0) {
    body.sub_items = subItems;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/categories`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  const rec = asRecord(data) ?? {};
  const inner = asRecord(rec.data) ?? rec;
  const id = inner.id ?? rec.id;
  if (id == null) {
    return { ok: false, message: "Create succeeded but response had no id." };
  }
  return { ok: true, id: String(id), raw: data };
}

export type CreateSubcategoryResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/** POST /api/categories/:parentId/subcategories — add one sub under an existing category */
export async function createSubcategoryRequest(
  accessToken: string | null,
  parentId: string,
  name: string
): Promise<CreateSubcategoryResult> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/categories/${encodeURIComponent(parentId)}/subcategories`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ name: name.trim() }),
      }
    );
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  const rec = asRecord(data) ?? {};
  const inner = asRecord(rec.data) ?? rec;
  const id = inner.id ?? rec.id;
  if (id == null) {
    return { ok: true, id: "" };
  }
  return { ok: true, id: String(id) };
}

export type UpdateCategoryResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * PUT /api/categories/:id — rename a top-level category (parent id) or subcategory (sub id).
 * Body: { "name": "..." }
 */
export async function updateCategoryRequest(
  accessToken: string | null,
  id: string,
  name: string
): Promise<UpdateCategoryResult> {
  const n = name.trim();
  if (!n) {
    return { ok: false, message: "Name is required." };
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/categories/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ name: n }),
      }
    );
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true };
}

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; message: string };

/** DELETE /api/categories/:id */
export async function deleteCategoryRequest(
  accessToken: string | null,
  id: string
): Promise<DeleteCategoryResult> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/categories/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: authHeaders(accessToken),
      }
    );
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true };
}
