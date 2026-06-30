import { getApiBase } from "@/lib/api-config";
import type { CategoryFilterField, CategoryFilterFieldType } from "@/lib/category-filter-fields";
import type { LookupMenuSlug } from "@/config/lookup-menu";
import type { ListLookupFieldOptionsResult } from "@/lib/categories-api";
import { listTeacherFormFieldOptions } from "@/lib/teacher-form-select-fields";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
  ApiTeacherFormSection,
  CreateTeacherFormFieldInput,
  CreateTeacherFormSectionInput,
  ReorderTeacherFormFieldsInput,
  UpdateTeacherFormFieldInput,
  UpdateTeacherFormSectionInput,
  TeacherFormFieldOrders,
} from "@/types/teacher-form-api";

const API_BASE = getApiBase();

function authHeaders(accessToken: string | null): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
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

function normalizeField(raw: Record<string, unknown>): ApiTeacherFormField {
  const optionsRaw = raw.options ?? raw.choices;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw.map(String).filter(Boolean)
    : undefined;
  const mapsTo =
    raw.mapsTo != null
      ? String(raw.mapsTo)
      : raw.maps_to != null
        ? String(raw.maps_to)
        : undefined;
  const key = String(raw.key ?? mapsTo ?? "");
  return {
    id: String(raw.id ?? key ?? ""),
    key,
    label: String(raw.label ?? raw.name ?? "Field"),
    type: String(raw.type ?? "text") as ApiTeacherFormField["type"],
    required: Boolean(raw.required ?? raw.is_required ?? false),
    sortOrder:
      typeof raw.sortOrder === "number"
        ? raw.sortOrder
        : typeof raw.sort_order === "number"
          ? raw.sort_order
          : undefined,
    options,
    sectionId: raw.sectionId != null ? String(raw.sectionId) : raw.section_id != null ? String(raw.section_id) : undefined,
    system: raw.system != null ? Boolean(raw.system) : undefined,
    deletable: raw.deletable != null ? Boolean(raw.deletable) : undefined,
    filter:
      raw.filter != null
        ? Number(raw.filter) > 0 || raw.filter === true
        : undefined,
  };
}

export function isFieldFilterEnabled(field: {
  filter?: boolean | number;
}): boolean {
  const f = field.filter;
  if (f == null) return false;
  return f === true || Number(f) > 0;
}

function mapFormFieldTypeToFilterType(
  type: ApiTeacherFormField["type"]
): CategoryFilterFieldType {
  switch (type) {
    case "select":
    case "multiselect":
    case "boolean":
    case "date":
    case "number":
    case "email":
    case "tel":
    case "textarea":
      return type;
    case "countries":
    case "indian_states":
    case "indian_cities":
    case "teacher_roles":
      return "select";
    default:
      return "text";
  }
}

/** Fields with filter toggle on in form builder → advanced search filters. */
export function filterFieldsFromTeacherFormConfig(
  config: ApiTeacherFormConfig
): CategoryFilterField[] {
  const out: CategoryFilterField[] = [];
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (!isFieldFilterEnabled(field)) continue;
      if (field.type === "work_experience") continue;
      out.push({
        id: field.id || field.key,
        label: field.label,
        key: field.key,
        type: mapFormFieldTypeToFilterType(field.type),
        options: field.options ?? [],
        sectionTitle: section.title,
        sortOrder: field.sortOrder ?? 0,
      });
    }
  }
  return out;
}

function normalizeSection(raw: Record<string, unknown>): ApiTeacherFormSection {
  const fieldsRaw = raw.fields ?? raw.form_fields ?? [];
  const fields = Array.isArray(fieldsRaw)
    ? fieldsRaw
        .map((f) => asRecord(f))
        .filter(Boolean)
        .map((f) => normalizeField(f!))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : [];

  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? raw.name ?? "Section"),
    description:
      raw.description != null ? String(raw.description) : undefined,
    sortOrder:
      typeof raw.sortOrder === "number"
        ? raw.sortOrder
        : typeof raw.sort_order === "number"
          ? raw.sort_order
          : undefined,
    system: raw.system != null ? Boolean(raw.system) : undefined,
    deletable: raw.deletable != null ? Boolean(raw.deletable) : undefined,
    fields,
  };
}

export function normalizeTeacherFormConfig(data: unknown): ApiTeacherFormConfig {
  const root = asRecord(data);
  if (!root) return { sections: [] };

  const sectionsRaw =
    root.sections ??
    (asRecord(root.data)?.sections ?? root.data) ??
    root.form;

  const sections = Array.isArray(sectionsRaw)
    ? sectionsRaw
        .map((s) => asRecord(s))
        .filter(Boolean)
        .map((s) => normalizeSection(s!))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : [];

  const config: ApiTeacherFormConfig = {
    sections,
    updatedAt:
      typeof root.updatedAt === "string"
        ? root.updatedAt
        : typeof root.updated_at === "string"
          ? root.updated_at
          : undefined,
  };
  return config;
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** GET /api/teacher-form */
export async function getTeacherFormRequest(
  accessToken: string | null
): Promise<ApiResult<ApiTeacherFormConfig>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teacher-form`, {
      headers: authHeaders(accessToken),
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true, data: normalizeTeacherFormConfig(data) };
}

/**
 * Lookup list options from GET /api/teacher-form (select / multiselect fields only).
 */
export async function listTeacherFormLookupOptionsRequest(
  accessToken: string | null,
  slug: string,
  page = 1,
  limit = 10,
  search = ""
): Promise<ListLookupFieldOptionsResult> {
  const formResult = await getTeacherFormRequest(accessToken);
  if (!formResult.ok) {
    return { ok: false, message: formResult.message };
  }

  const listed = listTeacherFormFieldOptions(
    formResult.data,
    slug as LookupMenuSlug,
    page,
    limit,
    search
  );

  if (!listed) {
    return {
      ok: false,
      message: `No select/multiselect field found in teacher-form for "${slug}".`,
    };
  }

  return {
    ok: true,
    options: listed.options,
    teacherFormFieldKey: listed.field.key,
    pagination: {
      slug,
      field: listed.field.label,
      parent: null,
      page: listed.page,
      limit: listed.limit,
      total: listed.total,
      totalPages: listed.totalPages,
      hasNextPage: listed.hasNextPage,
      hasPrevPage: listed.hasPrevPage,
      count: listed.options.length,
    },
  };
}

function findTeacherFormFieldInConfig(
  config: ApiTeacherFormConfig,
  fieldKey: string
): ApiTeacherFormField | undefined {
  for (const section of config.sections) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field) return field;
  }
  return undefined;
}

async function getTeacherFormFieldByKey(
  accessToken: string | null,
  fieldKey: string
): Promise<ApiResult<ApiTeacherFormField>> {
  const formResult = await getTeacherFormRequest(accessToken);
  if (!formResult.ok) {
    return { ok: false, message: formResult.message };
  }
  const field = findTeacherFormFieldInConfig(formResult.data, fieldKey);
  if (!field) {
    return {
      ok: false,
      message: `Field "${fieldKey}" was not found on the teacher form.`,
    };
  }
  return { ok: true, data: field };
}

function optionIndex(
  options: string[],
  label: string
): number {
  const needle = label.trim().toLowerCase();
  return options.findIndex((o) => o.trim().toLowerCase() === needle);
}

/** PATCH field with a new full `options` array (Form builder style). */
export async function setTeacherFormFieldOptionsRequest(
  accessToken: string | null,
  fieldKey: string,
  options: string[]
): Promise<ApiResult<ApiTeacherFormField>> {
  const fieldResult = await getTeacherFormFieldByKey(accessToken, fieldKey);
  if (!fieldResult.ok) return fieldResult;

  const field = fieldResult.data;
  const nextType =
    field.type === "select" || field.type === "multiselect"
      ? field.type
      : "select";

  return updateTeacherFormFieldRequest(accessToken, fieldKey, {
    label: field.label,
    type: nextType,
    required: Boolean(field.required),
    options,
  });
}

/** Append one option (same PATCH as Form builder: full `options` array). */
export function mergeTeacherFormFieldOptions(
  existing: string[],
  singleOption: string
): { options: string[]; duplicate: boolean } {
  const trimmed = singleOption.trim();
  if (!trimmed) {
    return { options: existing, duplicate: false };
  }
  const exists = existing.some(
    (o) => o.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) {
    return { options: existing, duplicate: true };
  }
  return { options: [...existing, trimmed], duplicate: false };
}

export async function appendTeacherFormFieldOptionRequest(
  accessToken: string | null,
  fieldKey: string,
  optionLabel: string
): Promise<ApiResult<ApiTeacherFormField>> {
  const fieldResult = await getTeacherFormFieldByKey(accessToken, fieldKey);
  if (!fieldResult.ok) return fieldResult;

  const { options: nextOptions, duplicate } = mergeTeacherFormFieldOptions(
    fieldResult.data.options ?? [],
    optionLabel
  );

  if (duplicate) {
    return { ok: false, message: "This option already exists." };
  }

  return setTeacherFormFieldOptionsRequest(
    accessToken,
    fieldKey,
    nextOptions
  );
}

export async function renameTeacherFormFieldOptionRequest(
  accessToken: string | null,
  fieldKey: string,
  fromLabel: string,
  toLabel: string
): Promise<ApiResult<ApiTeacherFormField>> {
  const trimmedTo = toLabel.trim();
  if (!trimmedTo) {
    return { ok: false, message: "Enter a value for the option." };
  }

  const fieldResult = await getTeacherFormFieldByKey(accessToken, fieldKey);
  if (!fieldResult.ok) return fieldResult;

  const current = fieldResult.data.options ?? [];
  const idx = optionIndex(current, fromLabel);
  if (idx < 0) {
    return { ok: false, message: "Option not found." };
  }

  const duplicate = current.some(
    (o, i) => i !== idx && o.trim().toLowerCase() === trimmedTo.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, message: "Another option already uses this name." };
  }

  const next = [...current];
  next[idx] = trimmedTo;
  return setTeacherFormFieldOptionsRequest(accessToken, fieldKey, next);
}

export async function removeTeacherFormFieldOptionRequest(
  accessToken: string | null,
  fieldKey: string,
  optionLabel: string
): Promise<ApiResult<ApiTeacherFormField>> {
  const fieldResult = await getTeacherFormFieldByKey(accessToken, fieldKey);
  if (!fieldResult.ok) return fieldResult;

  const current = fieldResult.data.options ?? [];
  const idx = optionIndex(current, optionLabel);
  if (idx < 0) {
    return { ok: false, message: "Option not found." };
  }

  const next = current.filter((_, i) => i !== idx);
  return setTeacherFormFieldOptionsRequest(accessToken, fieldKey, next);
}

/** POST /api/teacher-form/sections */
export async function createTeacherFormSectionRequest(
  accessToken: string | null,
  body: CreateTeacherFormSectionInput
): Promise<ApiResult<ApiTeacherFormSection>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teacher-form/sections`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  const rec = asRecord(data) ?? asRecord(asRecord(data)?.data);
  if (!rec) return { ok: false, message: "Invalid section response" };
  return { ok: true, data: normalizeSection(rec) };
}

/** PATCH /api/teacher-form/sections/:id */
export async function updateTeacherFormSectionRequest(
  accessToken: string | null,
  sectionId: string,
  body: UpdateTeacherFormSectionInput
): Promise<ApiResult<ApiTeacherFormSection>> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teacher-form/sections/${encodeURIComponent(sectionId)}`,
      {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify(body),
      }
    );
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  const rec = asRecord(data) ?? asRecord(asRecord(data)?.data);
  if (!rec) return { ok: true, data: normalizeSection({ id: sectionId, title: body.title ?? "", fields: [] }) };
  return { ok: true, data: normalizeSection(rec) };
}

/** DELETE /api/teacher-form/sections/:id */
export async function deleteTeacherFormSectionRequest(
  accessToken: string | null,
  sectionId: string
): Promise<ApiResult<true>> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teacher-form/sections/${encodeURIComponent(sectionId)}`,
      {
        method: "DELETE",
        headers: authHeaders(accessToken),
      }
    );
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  if (!res.ok) {
    const data = await parseJson(res);
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true, data: true };
}

/** POST /api/teacher-form/sections/:sectionId/fields */
export async function createTeacherFormFieldRequest(
  accessToken: string | null,
  sectionId: string,
  body: CreateTeacherFormFieldInput
): Promise<ApiResult<ApiTeacherFormField>> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teacher-form/sections/${encodeURIComponent(sectionId)}/fields`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(body),
      }
    );
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  const rec = asRecord(data) ?? asRecord(asRecord(data)?.data);
  if (!rec) return { ok: false, message: "Invalid field response" };
  return { ok: true, data: normalizeField(rec) };
}

/** PATCH /api/teacher-form/fields/:key */
export async function updateTeacherFormFieldRequest(
  accessToken: string | null,
  fieldKey: string,
  body: UpdateTeacherFormFieldInput
): Promise<ApiResult<ApiTeacherFormField>> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teacher-form/fields/${encodeURIComponent(fieldKey)}`,
      {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify(body),
      }
    );
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  const rec = asRecord(data) ?? asRecord(asRecord(data)?.data);
  if (!rec) return { ok: true, data: normalizeField({ key: fieldKey, label: body.label ?? fieldKey, type: body.type ?? "text" }) };
  return { ok: true, data: normalizeField(rec) };
}

/** DELETE /api/teacher-form/fields/:key */
export async function deleteTeacherFormFieldRequest(
  accessToken: string | null,
  fieldKey: string
): Promise<ApiResult<true>> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teacher-form/fields/${encodeURIComponent(fieldKey)}`,
      {
        method: "DELETE",
        headers: authHeaders(accessToken),
      }
    );
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  if (!res.ok) {
    const data = await parseJson(res);
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true, data: true };
}

/** POST /api/teacher-form/reorder — reorder fields within section(s) */
export async function reorderTeacherFormFieldsRequest(
  accessToken: string | null,
  fieldOrders: TeacherFormFieldOrders
): Promise<ApiResult<ApiTeacherFormConfig>> {
  const body: ReorderTeacherFormFieldsInput = { field_orders: fieldOrders };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teacher-form/reorder`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}.`,
    };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true, data: normalizeTeacherFormConfig(data) };
}

/** PUT /api/teacher-form — replace entire config */
export async function replaceTeacherFormRequest(
  accessToken: string | null,
  config: ApiTeacherFormConfig
): Promise<ApiResult<ApiTeacherFormConfig>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teacher-form`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify(config),
    });
  } catch {
    return { ok: false, message: `Could not reach API at ${API_BASE}.` };
  }
  const data = await parseJson(res);
  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }
  return { ok: true, data: normalizeTeacherFormConfig(data) };
}
