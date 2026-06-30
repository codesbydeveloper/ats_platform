import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import { appendTeacherListSearchParams } from "@/lib/teacher-list-search-params";
import {
  formatMultiselectStoredValue,
  mergeApiStringArrays,
  parseApiStringArray,
  parseMultiselectStoredValue,
  serializeApiStringArray,
} from "@/lib/multiselect-form-value";
import type { TeacherFilters } from "@/store/filter-store";
import type { Teacher, TeacherStatus, TeacherWorkExperience } from "@/types/teacher";

import { getApiBase } from "@/lib/api-config";
import { resolveResumeUrlFromApiRow } from "@/lib/teacher-resume";
import { isEmployedNo } from "@/lib/work-experience-form";
import {
  sanitizeApiStringArray,
  sanitizeApiText,
} from "@/lib/sanitize-api-values";

export { sanitizeApiText, sanitizeTeacherFormValues } from "@/lib/sanitize-api-values";

const API_BASE = getApiBase();

function resolveSubjectsTaught(values: TeacherFormValues): string[] {
  return mergeApiStringArrays(
    parseMultiselectStoredValue(values.subject),
    values.customFields?.subjects_taught,
    values.customFields?.subject_taught
  );
}

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

/** Work history row only — no per-job experience/salary (use top-level columns). */
function workExperienceSnake(
  w: TeacherFormValues["workHistory"][number]
): Record<string, unknown> {
  const from = toIsoOrPassThrough(w.from);
  const to = w.currentlyWorking ? null : toIsoDateOrNull(w.to ?? null);
  return {
    school_name: sanitizeApiText(w.schoolName),
    role: sanitizeApiText(w.role),
    from,
    to,
    currently_working: w.currentlyWorking,
  };
}

/** Same row — camelCase (NestJS + Prisma nested `workExperience` is common). */
function workExperienceCamel(
  w: TeacherFormValues["workHistory"][number]
): Record<string, unknown> {
  const from = toIsoOrPassThrough(w.from);
  const to = w.currentlyWorking ? null : toIsoDateOrNull(w.to ?? null);
  return {
    schoolName: sanitizeApiText(w.schoolName),
    role: sanitizeApiText(w.role),
    from,
    to,
    currentlyWorking: w.currentlyWorking,
  };
}

/** Build teacher object for API (multipart `teacher` field or JSON body). */
export function buildTeacherApiPayload(
  values: TeacherFormValues
): Record<string, unknown> {
  const employedNo = isEmployedNo(values.customFields);
  const workSnake = employedNo ? [] : values.workHistory.map(workExperienceSnake);
  const workCamel = employedNo ? [] : values.workHistory.map(workExperienceCamel);

  const teacherRoles = resolveTeacherRoles(values);
  const subjectsTaught = resolveSubjectsTaught(values);
  const areaOfInterest = mergeApiStringArrays(
    parseMultiselectStoredValue(values.areaOfInterest),
    values.customFields?.area_of_interest
  );
  const skills = mergeApiStringArrays(values.skills, values.customFields?.skills);
  const experienceYears = employedNo ? 0 : Number(values.experienceYears) || 0;
  const currentSalary = Number(values.currentSalary) || 0;
  const qualifications = parseMultiselectStoredValue(values.qualification);

  return {
    name: sanitizeApiText(values.name),
    mobile: sanitizeApiText(values.mobile),
    email: sanitizeApiText(values.email),
    country: sanitizeApiText(values.country) || "India",
    state: sanitizeApiText(values.state),
    city: sanitizeApiText(values.city),
    address: sanitizeApiText(values.address),
    subject_taught: formatMultiselectStoredValue(subjectsTaught),
    subjects_taught: subjectsTaught,
    boards_taught: sanitizeApiStringArray(values.boards),
    grades_taught: sanitizeApiStringArray(values.grades),
    teacher_roles: sanitizeApiStringArray(teacherRoles),
    skills: sanitizeApiStringArray(skills),
    reason_to_join: sanitizeApiStringArray(
      customFieldArray(values, "reason_to_join")
    ),
    where_did_you_hear_about_us: sanitizeApiStringArray(
      customFieldArray(values, "where_did_you_hear_about_us")
    ),
    work_experience: workSnake,
    workExperience: workCamel,
    /** Prisma-style nested create (many Nest services forward this to prisma.*.create) */
    work_experiences: { create: workSnake },
    workExperiences: { create: workCamel },
    ug_college: sanitizeApiText(values.ugCollege),
    pg_university: sanitizeApiText(values.pgUniversity),
    qualification: sanitizeApiText(values.qualification),
    qualifications: sanitizeApiStringArray(qualifications),
    certifications: sanitizeApiText(String(values.certifications ?? "")),
    additional_education: (values.extraEducation ?? [])
      .map((e) => sanitizeApiText(e.value))
      .filter(Boolean),
    current_location: sanitizeApiText(values.currentLocation),
    preferred_location: sanitizeApiText(values.preferredLocation),
    area_of_interest: sanitizeApiStringArray(areaOfInterest),
    current_salary: currentSalary,
    total_experience: experienceYears,
    experience_years: experienceYears,
    internal_notes: sanitizeApiText(values.notes ?? ""),
    status: values.status ?? "active",
    custom_fields: buildCustomFieldsPayload(values),
  };
}

function appendTeacherPayloadToFormData(
  formData: FormData,
  p: Record<string, unknown>
): void {
  formData.append("name", String(p.name).trim());
  formData.append("mobile", String(p.mobile).trim());
  formData.append("email", String(p.email).trim());
  formData.append("country", String(p.country ?? ""));
  formData.append("state", String(p.state));
  formData.append("city", String(p.city));
  formData.append("address", String(p.address));
  formData.append("subject_taught", String(p.subject_taught ?? ""));
  formData.append(
    "subjects_taught",
    serializeApiStringArray(parseApiStringArray(p.subjects_taught))
  );
  formData.append(
    "boards_taught",
    serializeApiStringArray(parseApiStringArray(p.boards_taught))
  );
  formData.append(
    "grades_taught",
    serializeApiStringArray(parseApiStringArray(p.grades_taught))
  );
  formData.append(
    "teacher_roles",
    serializeApiStringArray(parseApiStringArray(p.teacher_roles))
  );
  formData.append(
    "skills",
    serializeApiStringArray(parseApiStringArray(p.skills))
  );
  formData.append(
    "reason_to_join",
    serializeApiStringArray(parseApiStringArray(p.reason_to_join))
  );
  formData.append(
    "where_did_you_hear_about_us",
    serializeApiStringArray(parseApiStringArray(p.where_did_you_hear_about_us))
  );
  formData.append(
    "area_of_interest",
    serializeApiStringArray(parseApiStringArray(p.area_of_interest))
  );
  formData.append("work_experience", JSON.stringify(p.work_experience));
  formData.append("ug_college", String(p.ug_college));
  formData.append("pg_university", String(p.pg_university));
  formData.append("qualification", String(p.qualification));
  formData.append(
    "qualifications",
    serializeApiStringArray(parseApiStringArray(p.qualifications))
  );
  formData.append("certifications", String(p.certifications));
  formData.append(
    "additional_education",
    JSON.stringify(p.additional_education ?? [])
  );
  formData.append("current_location", String(p.current_location));
  formData.append("preferred_location", String(p.preferred_location));
  formData.append("current_salary", String(p.current_salary ?? 0));
  formData.append("total_experience", String(p.total_experience ?? 0));
  formData.append(
    "experience_years",
    String(p.experience_years ?? p.total_experience ?? 0)
  );
  formData.append("internal_notes", String(p.internal_notes ?? ""));
  formData.append("status", String(p.status ?? "active"));
  formData.append(
    "custom_fields",
    JSON.stringify(p.custom_fields ?? {})
  );
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
  return parseApiStringArray(v);
}

/** All area-of-interest values from a mapped teacher row. */
export function resolveTeacherAreaOfInterest(
  teacher: Pick<Teacher, "areaOfInterest" | "customFields">
): string[] {
  const cf = (teacher.customFields ?? {}) as Record<string, unknown>;
  return mergeApiStringArrays(
    teacher.areaOfInterest,
    cf.area_of_interest,
    cf.areas_of_interest,
    cf.areaOfInterest,
    cf.areasOfInterest
  );
}

function pickAreaOfInterestFromRow(
  r: Record<string, unknown>,
  customFields?: Record<string, string | number | boolean | string[]>
): string {
  const cf = customFields ?? {};
  return (
    mergeApiStringArrays(
      r.area_of_interest,
      r.areaOfInterest,
      r.areas_of_interest,
      r.areasOfInterest,
      cf.area_of_interest,
      cf.areas_of_interest
    ).join(", ") || ""
  );
}

function resolveTeacherRoles(values: TeacherFormValues): string[] {
  const cf = values.customFields ?? {};
  return mergeApiStringArrays(values.roles, cf.role, cf.teacher_roles);
}

function customFieldArray(
  values: TeacherFormValues,
  apiKey: string
): string[] {
  return parseApiStringArray(values.customFields?.[apiKey]);
}

/** Omit custom field keys already sent as top-level API columns. */
function buildCustomFieldsPayload(
  values: TeacherFormValues
): Record<string, unknown> {
  const cf: Record<string, unknown> = { ...(values.customFields ?? {}) };
  const lifted = [
    "role",
    "teacher_roles",
    "reason_to_join",
    "where_did_you_hear_about_us",
    "area_of_interest",
    "subject_taught",
    "subjects_taught",
    "certifications",
    "boards_taught",
    "grades_taught",
    "skills",
    "salary",
    "total_years_experience",
  ];
  for (const key of lifted) {
    delete cf[key];
  }
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(cf)) {
    if (Array.isArray(raw)) {
      const arr = sanitizeApiStringArray(raw.map(String));
      if (arr.length) out[key] = arr;
    } else if (typeof raw === "boolean" || typeof raw === "number") {
      out[key] = raw;
    } else {
      const text = sanitizeApiText(String(raw));
      if (text) out[key] = text;
    }
  }
  return out;
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

function pickText(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v == null) continue;
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
    if (Array.isArray(v)) {
      const first = v
        .map((x) => (typeof x === "string" ? x.trim() : x))
        .find((x) => typeof x === "string" ? x.length > 0 : x != null);
      if (typeof first === "string" && first.trim().length > 0) return first.trim();
      if (typeof first === "number" && !Number.isNaN(first)) return String(first);
    }
  }
  return "";
}

function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // Common cases: +91XXXXXXXXXX / 91XXXXXXXXXX / 0XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  // If extra digits are present (e.g. formatting mistakes), keep last 10.
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function mergeCustomFieldEntry(
  out: Record<string, string | number | boolean | string[]>,
  key: string,
  raw: unknown
): void {
  const k = key.trim();
  if (!k || raw == null) return;
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    if (typeof raw === "string" && !sanitizeApiText(raw)) return;
    out[k] = raw;
    return;
  }
  if (Array.isArray(raw)) {
    const arr = parseApiStringArray(raw);
    if (arr.length) out[k] = arr;
  }
}

function mergeSkillsBlobIntoCustomFields(
  raw: unknown,
  out: Record<string, string | number | boolean | string[]>
): void {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    mergeCustomFieldEntry(out, k, v);
  }
}

function parseCustomFields(
  raw: unknown
): Record<string, string | number | boolean | string[]> | undefined {
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    const out: Record<string, string | number | boolean | string[]> = {};
    for (const item of raw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      const key = String(rec.key ?? rec.field_key ?? rec.name ?? "").trim();
      if (!key) continue;
      mergeCustomFieldEntry(
        out,
        key,
        rec.value ?? rec.field_value ?? rec.val
      );
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parseCustomFields(parsed);
    } catch {
      return undefined;
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    return undefined;
  }

  const out: Record<string, string | number | boolean | string[]> = {};
  for (const [k, v] of Object.entries(obj)) {
    mergeCustomFieldEntry(out, k, v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function resumeFileLabel(r: Record<string, unknown>): string | null {
  const orig = pickStr(
    r,
    "resume_original_name",
    "resumeOriginalName",
    "resume_file_name",
    "resumeFileName",
    "resume_filename",
    "resumeFilename"
  );
  if (orig) return orig;
  const path = pickStr(r, "resume_path", "resumePath");
  if (path) {
    const last = path.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  }
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
    "school_organization",
    "schoolOrganization",
    "school",
    "organization",
    "organization_name",
    "company",
    "employer",
    "workplace"
  );
  const role = pickStr(
    w,
    "role",
    "current_role",
    "title",
    "position",
    "job_title"
  );
  if (!school && !role) return null;
  return {
    id: pickStr(w, "id") || `w-${i}-${Math.random().toString(36).slice(2, 8)}`,
    schoolName: school,
    role: role,
    from:
      pickStr(
        w,
        "from",
        "from_date",
        "start_date",
        "duration_from",
        "durationFrom"
      ) ||
      new Date().toISOString().slice(0, 10),
    to:
      typeof w.to === "string"
        ? w.to
        : w.to_date != null
          ? String(w.to_date)
          : w.duration_to != null
            ? String(w.duration_to)
            : w.durationTo != null
              ? String(w.durationTo)
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
  const teacherCode = pickStr(r, "teacher_id", "teacherId");

  const workRawProvided =
    r.work_experience != null || r.workExperience != null || r.work_history != null;
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

  const customFieldsParsed = parseCustomFields(r.custom_fields ?? r.customFields);

  return {
    id: String(idRaw),
    teacherCode: teacherCode || null,
    name: pickStr(r, "name", "full_name", "fullName") || "",
    email: pickStr(r, "email") || "",
    mobile: normalizeIndianMobile(pickStr(r, "mobile", "phone") || ""),
    city: pickStr(r, "city") || "",
    state: pickStr(r, "state") || "",
    country: pickStr(r, "country") || "India",
    address: pickStr(r, "address") || "",
    ugCollege:
      pickStr(r, "ug_college", "ugCollege", "college_attended_ug") || "",
    pgUniversity: pickStr(r, "pg_university", "pgUniversity") || "",
    qualification:
      mergeApiStringArrays(
        r.qualification,
        r.qualifications,
        r.educational_qualifications,
        r.educationalQualifications
      ).join(", ") || "",
    certifications: mergeApiStringArrays(r.certifications).join(", ") || "",
    extraEducation: asStrArr(
      r.additional_education ?? r.education_extras ?? r.extra_education
    ),
    subject:
      mergeApiStringArrays(
        r.subjects_taught,
        r.subject_taught,
        r.subject
      ).join(", ") || "",
    boards: mergeApiStringArrays(r.boards_taught, r.boards),
    grades: mergeApiStringArrays(r.grades_taught, r.grades),
    roles: mergeApiStringArrays(r.teacher_roles, r.roles),
    currentLocation:
      pickText(r, "current_location", "currentLocation") ||
      pickStr(r, "city") ||
      "",
    preferredLocation:
      pickText(r, "preferred_location", "preferredLocation") || "",
    areaOfInterest: pickAreaOfInterestFromRow(r, customFieldsParsed),
    currentSalary: asNum(r.current_salary ?? r.currentSalary, 0),
    experienceYears: asNum(
      r.total_experience ??
        r.total_years_experience ??
        r.totalYearsExperience ??
        r.experience_years ??
        r.experienceYears,
      0
    ),
    workHistory:
      workHistory.length > 0
        ? workHistory
        : workRawProvided
          ? []
          : [
              {
                id: `w-placeholder-${String(idRaw)}`,
                schoolName:
                  pickStr(r, "current_school", "school_name", "organization") ||
                  "",
                role: pickStr(r, "current_role", "role") || "",
                from: new Date().toISOString().slice(0, 10),
                to: null,
                currentlyWorking: true,
              },
            ],
    resumeFileName: resumeFileLabel(r),
    resumeUrl: resolveResumeUrlFromApiRow(r),
    resumeMime: null,
    notes: pickStr(r, "internal_notes", "notes") || "",
    status,
    skills: mergeApiStringArrays(
      Array.isArray(r.skills) ? r.skills : undefined,
      r.skills_tags
    ),
    customFields: (() => {
      const cf: Record<string, string | number | boolean | string[]> = {
        ...(customFieldsParsed ?? {}),
      };
      mergeSkillsBlobIntoCustomFields(r.skills, cf);
      const topLevelCustomKeys = [
        "candidate_roles",
        "candidate_type",
        "candidate_role",
        "alternate_number",
        "alternate_email",
        "alternate_mobile",
        "source",
        "informal_notes",
        "industry",
        "are_you_employed",
      ];
      for (const key of topLevelCustomKeys) {
        if (r[key] != null) mergeCustomFieldEntry(cf, key, r[key]);
      }
      if (mergeApiStringArrays(r.reason_to_join).length) {
        cf.reason_to_join = mergeApiStringArrays(r.reason_to_join);
      }
      if (mergeApiStringArrays(r.where_did_you_hear_about_us).length) {
        cf.where_did_you_hear_about_us = mergeApiStringArrays(
          r.where_did_you_hear_about_us
        );
      }
      return Object.keys(cf).length > 0 ? cf : undefined;
    })(),
    createdAt:
      pickStr(r, "created_at", "createdAt", "created") ||
      new Date().toISOString(),
  };
}

export type ListTeachersResult =
  | { ok: true; teachers: Teacher[]; total: number; page: number; limit: number }
  | { ok: false; message: string };

function appendListFilterParams(
  params: URLSearchParams,
  filters: TeacherFilters
): void {
  appendTeacherListSearchParams(params, filters);
}

/** GET /api/teachers?page=&limit= */
export async function listTeachersRequest(
  accessToken: string,
  page: number,
  limit: number,
  filters?: TeacherFilters
): Promise<ListTeachersResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filters) {
    appendListFilterParams(params, filters);
  }
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
      formData.append("resume_original_name", resumeFile.name);
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
  appendTeacherPayloadToFormData(formData, p);

  if (resumeFile) {
    formData.append("resume", resumeFile, resumeFile.name);
    formData.append("resume_original_name", resumeFile.name);
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
  appendTeacherListSearchParams(params, filters);
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

export type ExportTeachersFileFromApiResult =
  | { ok: true; filename: string; blob: Blob; format: "xlsx" | "csv" }
  | { ok: false; message: string };

/**
 * Export teachers from API (like `exportTeachersFromApi`) but return the file blob
 * so callers can post-process the XLSX before downloading.
 */
export async function exportTeachersFileFromApi(
  accessToken: string,
  args: {
    scope: "all" | "filtered" | "selected";
    format: "xlsx" | "csv";
    filters?: TeacherFilters;
    selectedIds?: string[];
  }
): Promise<ExportTeachersFileFromApiResult> {
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
  return { ok: true, filename, blob, format };
}

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
  const result = await exportTeachersFileFromApi(accessToken, args);
  if (!result.ok) return result;
  triggerBlobDownload(result.blob, result.filename);
  return { ok: true, filename: result.filename };
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

function extractTeacherRowFromApiBody(apiBody: unknown): Record<string, unknown> | null {
  if (!apiBody || typeof apiBody !== "object" || Array.isArray(apiBody)) {
    return null;
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
  return teacher;
}

/** Merge API response (id, resume path, etc.) into locally built teacher row. */
export function applyCreatedTeacherFromApi(
  apiBody: unknown,
  local: Teacher
): Teacher {
  const teacherRow = extractTeacherRowFromApiBody(apiBody);
  if (!teacherRow) return local;

  const mapped = mapApiRowToTeacher(teacherRow);
  if (mapped) {
    return {
      ...local,
      ...mapped,
      id: mapped.id || local.id,
      createdAt: local.createdAt || mapped.createdAt,
      customFields: { ...local.customFields, ...mapped.customFields },
    };
  }

  const idRaw = teacherRow.id;
  if (idRaw != null && String(idRaw).length > 0) {
    return { ...local, id: String(idRaw) };
  }
  return local;
}
