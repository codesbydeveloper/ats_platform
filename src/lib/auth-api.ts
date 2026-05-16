import type { AuthUser } from "@/types/auth";

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:8000";

export type SignInResult =
  | { ok: true; user: AuthUser; accessToken: string | null }
  | { ok: false; message: string };

function pickToken(data: Record<string, unknown>): string | null {
  const candidates = [
    data.accessToken,
    data.token,
    data.access_token,
    data.jwt,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  const inner = data.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const d = inner as Record<string, unknown>;
    return pickToken(d);
  }
  return null;
}

function pickUser(
  data: Record<string, unknown>,
  fallbackEmail: string
): AuthUser {
  const raw =
    (data.user && typeof data.user === "object" && data.user) ||
    (data.data &&
      typeof data.data === "object" &&
      !Array.isArray(data.data) &&
      (data.data as Record<string, unknown>).user) ||
    data;

  const u =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const email =
    (typeof u.email === "string" && u.email) ||
    (typeof data.email === "string" && data.email) ||
    fallbackEmail;

  const name =
    (typeof u.name === "string" && u.name) ||
    (typeof u.fullName === "string" && u.fullName) ||
    (typeof u.full_name === "string" && u.full_name) ||
    email.split("@")[0] ||
    "User";

  return { email: email.trim(), name };
}

function errorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return `Sign in failed (${status})`;
  }
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string") return d.message;
  if (Array.isArray(d.message)) {
    return d.message.map(String).join(", ");
  }
  if (typeof d.error === "string") return d.error;
  if (typeof d.detail === "string") return d.detail;
  return `Sign in failed (${status})`;
}

/** POST /api/auth/signin — JSON { email, password } */
export async function signInRequest(
  email: string,
  password: string
): Promise<SignInResult> {
  const trimmed = email.trim();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, password }),
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: Record<string, unknown> = {};
  try {
    const json = await res.json();
    if (json && typeof json === "object" && !Array.isArray(json)) {
      data = json as Record<string, unknown>;
    }
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    return { ok: false, message: errorMessage(data, res.status) };
  }

  const accessToken = pickToken(data);
  const user = pickUser(data, trimmed);

  return { ok: true, user, accessToken };
}

/** POST /api/auth/logout — Authorization: Bearer <token> */
export async function logoutRequest(accessToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch {
    /* Network error — caller still clears local session */
  }
}
