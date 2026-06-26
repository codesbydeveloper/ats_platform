import { getApiBase } from "@/lib/api-config";

type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

const API_BASE = getApiBase();

function authHeaders(accessToken: string | null): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken?.trim()) {
    h.Authorization = `Bearer ${accessToken}`;
  }
  return h;
}

function unwrapColumnsPayload(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const r = data as Record<string, unknown>;
  const direct = r.columns;
  if (Array.isArray(direct)) return direct.map(String).filter(Boolean);
  const inner = r.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const c = (inner as Record<string, unknown>).columns;
    if (Array.isArray(c)) return c.map(String).filter(Boolean);
  }
  return [];
}

export async function getTeachersTableColumnsRequest(
  accessToken: string | null
): Promise<ApiResult<{ columns: string[] }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/table-columns/teachers`, {
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
    /* ignore */
  }

  if (!res.ok) {
    return { ok: false, message: `Request failed (${res.status})` };
  }

  return { ok: true, data: { columns: unwrapColumnsPayload(data) } };
}

export async function putTeachersTableColumnsRequest(
  accessToken: string | null,
  columns: string[]
): Promise<ApiResult<{ columns: string[] }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/table-columns/teachers`, {
      method: "PUT",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ columns }),
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
    /* ignore */
  }

  if (!res.ok) {
    return { ok: false, message: `Request failed (${res.status})` };
  }

  const echoed = unwrapColumnsPayload(data);
  return { ok: true, data: { columns: echoed.length ? echoed : columns } };
}

