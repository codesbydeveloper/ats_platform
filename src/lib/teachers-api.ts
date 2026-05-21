import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import type { TeacherFilters } from "@/store/filter-store";
import type { Teacher, TeacherStatus, TeacherWorkExperience } from "@/types/teacher";

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "https://ats.raomtech.com";

/** Normalize HTML date (YYYY-MM-DD) to ISO for APIs / ORMs that expect full timestamps. */
function toIsoDateOrNull(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toIsoOrPassThrough(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

/** One employment row — snake_case (Postman / many DTOs). */
function workExperienceSnake(
  w: TeacherFormValues["workHistory"][number]
): Record<string, unknown> {
  const from = toIsoOrPassThrough(w.from);
  const to = w.currentlyWorking ? null : toIsoDateOrNull(w.to ?? null);
  return {
    school_name: w.schoolName,
    role: w.role,
    from,
    to,
    currently_working: w.currentlyWorking,
    // Aliases some backends / DB mappers expect
    duration_from: from,
    duration_to: to,
  };
}

/** Same row — camelCase (NestJS + Prisma nested `workExperience` is common). */
function workExperienceCamel(
  w: TeacherFormValues["workHistory"][number]
): Record<string, unknown> {
  const from = toIsoOrPassThrough(w.from);
  const to = w.currentlyWorking ? null : toIsoDateOrNull(w.to ?? null);
  return {
    schoolName: w.schoolName,
    organizationName: w.schoolName,
    role: w.role,
    from,
    to,
    currentlyWorking: w.currentlyWorking,
    durationFrom: from,
    durationTo: to,
  };
}

/** Build teacher object for API (multipart `teacher` field or JSON body). */
export function buildTeacherApiPayload(
  values: TeacherFormValues
): Record<string, unknown> {
  const workSnake = values.workHistory.map(workExperienceSnake);
  const workCamel = values.workHistory.map(workExperienceCamel);

  return {
    name: values.name,
    mobile: values.mobile,
    email: values.email,
    state: values.state,
    city: values.city,
    address: values.address,
    subject_taught: values.subject,
    boards_taught: values.boards,
    grades_taught: values.grades,
    teacher_roles: values.roles,
    skills:
      values.skills && values.skills.length > 0 ? values.skills : [],
    work_experience: workSnake,
    workExperience: workCamel,
    /** Prisma-style nested create (many Nest services forward this to prisma.*.create) */
    work_experiences: { create: workSnake },
    workExperiences: { create: workCamel },
    ug_college: values.ugCollege,
    pg_university: values.pgUniversity,
    qualification: values.qualification,
    certifications: values.certifications ?? "",
    additional_education: (values.extraEducation ?? [])
      .map((e) => e.value.trim())
      .filter(Boolean),
    current_location: values.currentLocation,
    preferred_location: values.preferredLocation,
    area_of_interest: values.areaOfInterest,
    current_salary: values.currentSalary,
    total_experience: values.experienceYears,
    internal_notes: values.notes ?? "",
    status: values.status,
  };
}

/** Multipart field `teacher` — JSON string */
export function formValuesToTeacherApiJson(values: TeacherFormValues): string {
  return JSON.stringify(buildTeacherApiPayload(values));
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

function unwrapRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return data as Record<string, unknown>;
}

function pickTotal(obj: Record<string, unknown>): number {
  const direct = obj.total ?? obj.totalCount ?? obj.count;
  if (typeof direct === "number" && !Number.isNaN(direct)) return direct;
  const p = obj.pagination ?? obj.meta;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    const t = (p as Record<string, unknown>).total;
    if (typeof t === "number" && !Number.isNaN(t)) return t;
  }
  return 0;
}

function extractTeachersPayload(data: unknown): {
  rawList: unknown[];
  total: number;
} {
  const root = unwrapRecord(data);
  const tryList = (obj: Record<string, unknown>): unknown[] => {
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.teachers)) return obj.teachers;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.results)) return obj.results;
    const inner = obj.data;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const n = inner as Record<string, unknown>;
      if (Array.isArray(n.items)) return n.items;
      if (Array.isArray(n.data)) return n.data;
      if (Array.isArray(n.teachers)) return n.teachers;
    }
    return [];
  };

  let rawList = tryList(root);
  let total = pickTotal(root);

  if (!total && root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    total = pickTotal(root.data as Record<string, unknown>);
  }

  if (!total) {
    total = rawList.length;
  }

  return { rawList, total };
}

function asStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v == null) continue;
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return "";
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function resumeFileLabel(r: Record<string, unknown>): string | null {
  const fn = pickStr(
    r,
    "resume_file_name",
    "resumeFileName",
    "resume_filename",
    "resumeFilename"
  );
  if (fn) return fn;
  const url = pickStr(r, "resume_url", "resumeUrl", "resume");
  if (!url) return null;
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    const last = url.split("/").filter(Boolean).pop();
    if (last) return last;
  }
  return url;
}

function mapWorkExpItem(
  x: unknown,
  i: number
): TeacherWorkExperience | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const w = x as Record<string, unknown>;
  const school = pickStr(
    w,
    "school_name",
    "schoolName",
    "school",
    "organization"
  );
  const role = pickStr(w, "role", "current_role");
  if (!school && !role) return null;
  return {
    id: pickStr(w, "id") || `w-${i}-${Math.random().toString(36).slice(2, 8)}`,
    schoolName: school || "—",
    role: role || "—",
    from:
      pickStr(w, "from", "from_date", "start_date") ||
      new Date().toISOString().slice(0, 10),
    to:
      typeof w.to === "string"
        ? w.to
        : w.to_date != null
          ? String(w.to_date)
          : null,
    currentlyWorking: Boolean(
      w.currently_working ??
        w.currentlyWorking ??
        w.is_currently_working ??
        false
    ),
  };
}

/** Map one API teacher row (snake_case or camelCase) to local `Teacher`. */
export function mapApiRowToTeacher(row: unknown): Teacher | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const r = row as Record<string, unknown>;
  const idRaw = r.id ?? r.teacher_id;
  if (idRaw == null || String(idRaw).length === 0) return null;

  const workRaw = r.work_experience ?? r.workExperience ?? r.work_history;
  let workHistory: TeacherWorkExperience[] = [];
  if (Array.isArray(workRaw)) {
    workHistory = workRaw
      .map((item, i) => mapWorkExpItem(item, i))
      .filter((x): x is TeacherWorkExperience => x != null);
  }

  const statusRaw = String(r.status ?? "active").toLowerCase();
  const status: TeacherStatus =
    statusRaw === "inactive" || statusRaw === "pending" ? statusRaw : "active";

  return {
    id: String(idRaw),
    name: pickStr(r, "name", "full_name", "fullName") || "Unknown",
    email: pickStr(r, "email") || "—",
    mobile: pickStr(r, "mobile", "phone") || "—",
    city: pickStr(r, "city") || "—",
    state: pickStr(r, "state") || "—",
    address: pickStr(r, "address") || "—",
    ugCollege: pickStr(r, "ug_college", "ugCollege", "college_attended_ug") || "—",
    pgUniversity: pickStr(r, "pg_university", "pgUniversity") || "—",
    qualification:
      pickStr(r, "qualification", "educational_qualifications") || "—",
    certifications: pickStr(r, "certifications") || "",
    extraEducation: asStrArr(
      r.additional_education ?? r.education_extras ?? r.extra_education
    ),
    subject: pickStr(r, "subject", "subject_taught") || "—",
    boards: asStrArr(r.boards_taught ?? r.boards),
    grades: asStrArr(r.grades_taught ?? r.grades),
    roles: asStrArr(r.teacher_roles ?? r.roles),
    currentLocation:
      pickStr(r, "current_location", "currentLocation") ||
      pickStr(r, "city") ||
      "—",
    preferredLocation:
      pickStr(r, "preferred_location", "preferredLocation") || "—",
    areaOfInterest:
      pickStr(r, "area_of_interest", "areaOfInterest") || "—",
    currentSalary: asNum(r.current_salary ?? r.currentSalary, 0),
    experienceYears: asNum(
      r.total_experience ??
        r.experience_years ??
        r.experienceYears,
      0
    ),
    workHistory:
      workHistory.length > 0
        ? workHistory
        : [
            {
              id: `w-placeholder-${String(idRaw)}`,
              schoolName:
                pickStr(r, "current_school", "school_name", "organization") ||
                "—",
              role: pickStr(r, "current_role", "role") || "—",
              from: new Date().toISOString().slice(0, 10),
              to: null,
              currentlyWorking: true,
            },
          ],
    resumeFileName: resumeFileLabel(r),
    resumeMime: null,
    notes: pickStr(r, "internal_notes", "notes") || "",
    status,
    skills: asStrArr(r.skills),
    createdAt:
      pickStr(r, "created_at", "createdAt", "created") ||
      new Date().toISOString(),
  };
}

export type ListTeachersResult =
  | { ok: true; teachers: Teacher[]; total: number; page: number; limit: number }
  | { ok: false; message: string };

/** GET /api/teachers?page=&limit= */
export async function listTeachersRequest(
  accessToken: string,
  page: number,
  limit: number
): Promise<ListTeachersResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teachers?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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

  const { rawList, total } = extractTeachersPayload(data);
  const teachers = rawList
    .map(mapApiRowToTeacher)
    .filter((t): t is Teacher => t != null);

  return { ok: true, teachers, total, page, limit };
}

/** Unwrap `{ data: {...} }` / `{ teacher: {...} }` for GET-by-id responses. */
function extractSingleTeacherPayload(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const r = data as Record<string, unknown>;
  const innerData = r.data;
  if (innerData && typeof innerData === "object" && !Array.isArray(innerData)) {
    return innerData;
  }
  const innerTeacher = r.teacher;
  if (
    innerTeacher &&
    typeof innerTeacher === "object" &&
    !Array.isArray(innerTeacher)
  ) {
    return innerTeacher;
  }
  return data;
}

export type GetTeacherResult =
  | { ok: true; teacher: Teacher }
  | { ok: false; message: string };

/** GET /api/teachers/:id */
export async function getTeacherRequest(
  accessToken: string,
  teacherId: string
): Promise<GetTeacherResult> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teachers/${encodeURIComponent(teacherId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
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

  const row = extractSingleTeacherPayload(data);
  const teacher = mapApiRowToTeacher(row);
  if (!teacher) {
    return {
      ok: false,
      message: "Server returned a teacher record we could not read.",
    };
  }

  return { ok: true, teacher };
}

export type CreateTeacherResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string };

/** POST /api/teachers — JSON body when no resume; multipart when resume is attached. */
export async function createTeacherRequest(
  accessToken: string,
  values: TeacherFormValues,
  resumeFile: File | null
): Promise<CreateTeacherResult> {
  const payload = buildTeacherApiPayload(values);
  let res: Response;

  try {
    if (!resumeFile) {
      res = await fetch(`${API_BASE}/api/teachers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } else {
      const formData = new FormData();
      formData.append("teacher", JSON.stringify(payload));
      const workSnake = values.workHistory.map(workExperienceSnake);
      const workCamel = values.workHistory.map(workExperienceCamel);
      formData.append("work_experience", JSON.stringify(workSnake));
      formData.append("workExperience", JSON.stringify(workCamel));
      formData.append("resume", resumeFile, resumeFile.name);
      res = await fetch(`${API_BASE}/api/teachers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
    }
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
    return {
      ok: false,
      message: apiErrorMessage(data, res.status),
    };
  }

  return { ok: true, data };
}

export type UpdateTeacherResult = CreateTeacherResult;

/**
 * PUT /api/teachers/:id — multipart with flat fields (`--form 'name=...'` style)
 * like Postman; optional `resume` file.
 */
export async function updateTeacherRequest(
  accessToken: string,
  teacherId: string,
  values: TeacherFormValues,
  resumeFile: File | null
): Promise<UpdateTeacherResult> {
  const p = buildTeacherApiPayload(values);
  const formData = new FormData();

  formData.append("name", String(p.name).trim());
  formData.append("mobile", String(p.mobile).trim());
  formData.append("email", String(p.email).trim());
  formData.append("state", String(p.state));
  formData.append("city", String(p.city));
  formData.append("address", String(p.address));
  formData.append("subject_taught", String(p.subject_taught));
  formData.append("boards_taught", JSON.stringify(p.boards_taught));
  formData.append("grades_taught", JSON.stringify(p.grades_taught));
  formData.append("teacher_roles", JSON.stringify(p.teacher_roles));
  formData.append("skills", JSON.stringify(p.skills));
  formData.append("work_experience", JSON.stringify(p.work_experience));
  formData.append("ug_college", String(p.ug_college));
  formData.append("pg_university", String(p.pg_university));
  formData.append("qualification", String(p.qualification));
  formData.append("certifications", String(p.certifications));
  formData.append("current_location", String(p.current_location));
  formData.append("preferred_location", String(p.preferred_location));
  formData.append("area_of_interest", String(p.area_of_interest));
  formData.append("current_salary", String(p.current_salary));
  formData.append("total_experience", String(p.total_experience));
  formData.append("internal_notes", String(p.internal_notes));
  formData.append("status", String(p.status));

  if (resumeFile) {
    formData.append("resume", resumeFile, resumeFile.name);
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teachers/${encodeURIComponent(teacherId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
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
    return {
      ok: false,
      message: apiErrorMessage(data, res.status),
    };
  }

  return { ok: true, data };
}

export type DeleteTeacherResult = CreateTeacherResult;

/** DELETE /api/teachers/:id */
export async function deleteTeacherRequest(
  accessToken: string,
  teacherId: string
): Promise<DeleteTeacherResult> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teachers/${encodeURIComponent(teacherId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
    /* 204 / empty body */
  }

  if (!res.ok) {
    return {
      ok: false,
      message: apiErrorMessage(data, res.status),
    };
  }

  return { ok: true, data };
}

export type BulkDeleteTeachersResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string };

/** POST /api/teachers/bulk-delete — JSON `{ ids: [...] }` (numeric ids as numbers). */
export async function bulkDeleteTeachersRequest(
  accessToken: string,
  ids: string[]
): Promise<BulkDeleteTeachersResult> {
  if (!ids.length) {
    return { ok: false, message: "No ids provided" };
  }
  const bodyIds = ids.map((id) => {
    const t = id.trim();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    return id;
  });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teachers/bulk-delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: bodyIds }),
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
    /* 204 / empty */
  }

  if (!res.ok) {
    return {
      ok: false,
      message: apiErrorMessage(data, res.status),
    };
  }

  return { ok: true, data };
}

function appendExportFilterParams(
  params: URLSearchParams,
  filters: TeacherFilters
): void {
  const q = filters.search?.trim();
  if (q) params.set("q", q);
  for (const c of filters.cities) params.append("city", c);
  for (const s of filters.status) params.append("status", s);
  for (const s of filters.subjects) params.append("subject", s);
  for (const r of filters.roles) params.append("role", r);
  for (const g of filters.grades) params.append("grade", g);
  for (const b of filters.boards) params.append("board", b);
  for (const s of filters.states) params.append("state", s);
  for (const e of filters.experience) params.append("experience", e);
  for (const sk of filters.skills) params.append("skill", sk);
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    const raw = star[1]!.trim().replace(/^["']|["']$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const plain = /filename=["']?([^"';]+)/i.exec(header);
  if (plain) return plain[1]!.trim();
  return null;
}

/** Force filename extension + MIME to match requested format (server may mislabel CSV as Excel). */
function normalizeExportDownload(
  rawName: string | null,
  format: "xlsx" | "csv"
): { filename: string; mime: string } {
  const mime =
    format === "csv"
      ? "text/csv;charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const fallback =
    format === "csv" ? "teachers-export.csv" : "teachers-export.xlsx";
  const name = (rawName?.trim() || fallback).replace(/[/\\]/g, "_");
  const lower = name.toLowerCase();

  if (format === "csv") {
    if (lower.endsWith(".csv")) return { filename: name, mime };
    if (lower.endsWith(".xlsx"))
      return { filename: `${name.slice(0, -5)}.csv`, mime };
    if (lower.endsWith(".xls"))
      return { filename: `${name.slice(0, -4)}.csv`, mime };
    const noExt = !name.includes(".");
    if (noExt) return { filename: `${name}.csv`, mime };
    return { filename: name.replace(/\.[^.]+$/, "") + ".csv", mime };
  }

  if (lower.endsWith(".xlsx")) return { filename: name, mime };
  if (lower.endsWith(".csv"))
    return { filename: `${name.slice(0, -4)}.xlsx`, mime };
  if (!name.includes(".")) return { filename: `${name}.xlsx`, mime };
  return { filename: name.replace(/\.[^.]+$/, "") + ".xlsx", mime };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** JSON `ids` array: numeric strings → number (matches Postman/curl). */
function idForExportJson(id: string): number | string {
  const t = id.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return id;
}

async function readExportError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text.trim()) return `Request failed (${res.status})`;
  try {
    const data = JSON.parse(text) as unknown;
    if (data && typeof data === "object") {
      return apiErrorMessage(data, res.status);
    }
  } catch {
    /* plain text */
  }
  return text;
}

export type DownloadTeacherResumeResult =
  | { ok: true; filename: string }
  | { ok: false; message: string };

/**
 * GET /api/teachers/:id/resume/download — follows redirects (curl -L).
 */
export async function downloadTeacherResumeRequest(
  accessToken: string | null,
  teacherId: string,
  fallbackFileName?: string | null
): Promise<DownloadTeacherResumeResult> {
  if (!accessToken) {
    return {
      ok: false,
      message: "Sign in to download resumes from the server.",
    };
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/teachers/${encodeURIComponent(teacherId)}/resume/download`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "follow",
      }
    );
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  if (!res.ok) {
    return { ok: false, message: await readExportError(res) };
  }

  const buf = await res.arrayBuffer();
  const fromHeader = filenameFromContentDisposition(
    res.headers.get("Content-Disposition")
  );
  const fallback =
    fallbackFileName?.trim() || `teacher-${teacherId}-resume.docx`;
  const filename = (fromHeader ?? fallback).replace(/[/\\]/g, "_");
  const contentType =
    res.headers.get("Content-Type") ?? "application/octet-stream";
  const blob = new Blob([buf], { type: contentType });
  triggerBlobDownload(blob, filename);
  return { ok: true, filename };
}

export type ExportTeachersFromApiResult =
  | { ok: true; filename: string }
  | { ok: false; message: string };

/**
 * Export teachers from API:
 * - all / filtered: GET `?scope=...&format=...` (+ filter query params)
 * - selected: POST JSON `{ scope, format, ids }` (same as curl)
 */
export async function exportTeachersFromApi(
  accessToken: string,
  args: {
    scope: "all" | "filtered" | "selected";
    format: "xlsx" | "csv";
    filters?: TeacherFilters;
    selectedIds?: string[];
  }
): Promise<ExportTeachersFromApiResult> {
  const { scope, format, filters, selectedIds } = args;

  let res: Response;

  if (scope === "selected") {
    const ids = selectedIds ?? [];
    if (!ids.length) {
      return { ok: false, message: "No rows selected" };
    }
    try {
      res = await fetch(`${API_BASE}/api/teachers/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "selected",
          format,
          ids: ids.map((id) => idForExportJson(id)),
        }),
      });
    } catch {
      return {
        ok: false,
        message: `Could not reach API at ${API_BASE}. Is the server running?`,
      };
    }
  } else {
    const params = new URLSearchParams();
    params.set("scope", scope);
    params.set("format", format);
    if (scope === "filtered" && filters) {
      appendExportFilterParams(params, filters);
    }
    try {
      res = await fetch(`${API_BASE}/api/teachers/export?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      return {
        ok: false,
        message: `Could not reach API at ${API_BASE}. Is the server running?`,
      };
    }
  }

  if (!res.ok) {
    return { ok: false, message: await readExportError(res) };
  }

  const buf = await res.arrayBuffer();
  const fromHeader = filenameFromContentDisposition(
    res.headers.get("Content-Disposition")
  );
  const { filename, mime } = normalizeExportDownload(fromHeader, format);
  const blob = new Blob([buf], { type: mime });
  triggerBlobDownload(blob, filename);
  return { ok: true, filename };
}

export type ImportTeachersFileResult =
  | { ok: true; data: unknown; message: string }
  | { ok: false; message: string };

function importSuccessMessage(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Spreadsheet imported successfully.";
  }
  const root = data as Record<string, unknown>;
  const inner =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const count =
    inner.imported ??
    inner.imported_count ??
    inner.created ??
    inner.count ??
    root.imported;
  if (typeof count === "number") {
    return `${count} teacher${count === 1 ? "" : "s"} imported.`;
  }
  if (typeof root.message === "string" && root.message.trim()) {
    return root.message.trim();
  }
  return "Spreadsheet imported successfully.";
}

export type ParseResumeResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string };

/** POST /api/teachers/parse-resume — multipart field `resume` (PDF or DOCX). */
export async function parseResumeRequest(
  accessToken: string,
  file: File
): Promise<ParseResumeResult> {
  const formData = new FormData();
  formData.append("resume", file, file.name);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teachers/parse-resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}/api/teachers/parse-resume. Is the server running?`,
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

  return { ok: true, data };
}

/** POST /api/teachers/import — multipart field `file` (spreadsheet). */
export async function importTeachersFileRequest(
  accessToken: string,
  file: File
): Promise<ImportTeachersFileResult> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/teachers/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}/api/teachers/import. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    return {
      ok: false,
      message: apiErrorMessage(data, res.status),
    };
  }

  return { ok: true, data, message: importSuccessMessage(data) };
}

/** Merge API response id (if any) into locally built teacher row. */
export function applyCreatedTeacherFromApi(
  apiBody: unknown,
  local: Teacher
): Teacher {
  if (!apiBody || typeof apiBody !== "object" || Array.isArray(apiBody)) {
    return local;
  }
  const root = apiBody as Record<string, unknown>;
  const row =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const teacher =
    row.teacher &&
    typeof row.teacher === "object" &&
    !Array.isArray(row.teacher)
      ? (row.teacher as Record<string, unknown>)
      : row;

  const idRaw = teacher.id ?? row.id ?? root.id;
  if (idRaw != null && String(idRaw).length > 0) {
    return { ...local, id: String(idRaw) };
  }
  return local;
}
