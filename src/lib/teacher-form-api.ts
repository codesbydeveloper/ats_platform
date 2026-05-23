import { getApiBase } from "@/lib/api-config";
import type {
  ApiTeacherFormConfig,
  ApiTeacherFormField,
  ApiTeacherFormSection,
  CreateTeacherFormFieldInput,
  CreateTeacherFormSectionInput,
  UpdateTeacherFormFieldInput,
  UpdateTeacherFormSectionInput,
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
  return {
    id: String(raw.id ?? raw.key ?? ""),
    key: String(raw.key ?? ""),
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
  };
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

  return {
    sections,
    updatedAt:
      typeof root.updatedAt === "string"
        ? root.updatedAt
        : typeof root.updated_at === "string"
          ? root.updated_at
          : undefined,
  };
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
