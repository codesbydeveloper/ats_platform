import { getApiBase } from "@/lib/api-config";
import type { Teacher } from "@/types/teacher";

const API_BASE = getApiBase();

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Build a browser-openable resume URL from an API teacher row. */
export function resolveResumeUrlFromApiRow(
  row: Record<string, unknown>
): string | null {
  const url = pickStr(row, "resume_url", "resumeUrl");
  if (url && /^https?:\/\//i.test(url)) return url;

  const path = pickStr(row, "resume_path", "resumePath");
  if (path) {
    if (/^https?:\/\//i.test(path)) return path;
    return path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  }

  if (url) {
    return url.startsWith("/") ? `${API_BASE}${url}` : `${API_BASE}/${url}`;
  }

  return null;
}

export function teacherResumeDownloadApiUrl(teacherId: string): string {
  return `${API_BASE}/api/teachers/${encodeURIComponent(teacherId)}/resume/download`;
}

export type OpenTeacherResumeResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Open resume in a new browser tab. Uses public `resumeUrl` when available;
 * otherwise fetches via authenticated download endpoint and opens a blob URL.
 */
export async function openTeacherResumeInNewTab(
  accessToken: string | null,
  teacher: Teacher
): Promise<OpenTeacherResumeResult> {
  const direct = teacher.resumeUrl?.trim();
  if (direct && !direct.includes("/api/teachers/")) {
    window.open(direct, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  if (!accessToken) {
    return {
      ok: false,
      message: "Sign in to open resumes from the server.",
    };
  }

  let res: Response;
  try {
    res = await fetch(teacherResumeDownloadApiUrl(teacher.id), {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "follow",
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  if (!res.ok) {
    let message = "Could not open resume.";
    try {
      const data = await res.json();
      if (data && typeof data === "object" && "message" in data) {
        message = String((data as { message: unknown }).message);
      }
    } catch {
      /* ignore */
    }
    return { ok: false, message };
  }

  const buf = await res.arrayBuffer();
  const contentType =
    res.headers.get("Content-Type") ?? "application/octet-stream";
  const blob = new Blob([buf], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    return {
      ok: false,
      message: "Pop-up blocked. Allow pop-ups for this site and try again.",
    };
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  return { ok: true };
}
