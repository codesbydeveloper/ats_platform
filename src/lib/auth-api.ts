import type { AuthUser } from "@/types/auth";
import { getApiBase } from "@/lib/api-config";

const API_BASE = getApiBase();

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
    (email ? email.split("@")[0] : "") ||
    "User";

  const idRaw = u.id ?? u.user_id;
  const id =
    idRaw != null && String(idRaw).length > 0 ? String(idRaw) : undefined;

  const number =
    (typeof u.number === "string" && u.number) ||
    (typeof u.phone === "string" && u.phone) ||
    (typeof u.mobile === "string" && u.mobile) ||
    undefined;

  return {
    id,
    email: email.trim(),
    name: name.trim() || "User",
    number: number?.trim() || undefined,
  };
}

function apiErrorMessage(data: unknown, status: number, fallback: string): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return `${fallback} (${status})`;
  }
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (typeof d.message === "string") return d.message;
  if (Array.isArray(d.message)) {
    return d.message.map(String).join(", ");
  }
  if (typeof d.error === "string") return d.error;
  return `${fallback} (${status})`;
}

function errorMessage(data: unknown, status: number): string {
  return apiErrorMessage(data, status, "Sign in failed");
}

function bearerHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    ...bearerHeaders(accessToken),
    "Content-Type": "application/json",
  };
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

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

/** GET /api/auth/me */
export async function getMeRequest(
  accessToken: string
): Promise<ApiResult<{ user: AuthUser }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: bearerHeaders(accessToken),
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
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status, "Request failed") };
  }

  return { ok: true, data: { user: pickUser(data, "") } };
}

/** PATCH /api/auth/profile — { name, email, number } */
export async function updateProfileRequest(
  accessToken: string,
  profile: { name: string; email: string; number?: string }
): Promise<ApiResult<{ user: AuthUser }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        name: profile.name.trim(),
        email: profile.email.trim(),
        number: (profile.number ?? "").trim(),
      }),
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
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status, "Could not save profile") };
  }

  return { ok: true, data: { user: pickUser(data, profile.email) } };
}

/** POST /api/auth/change-password */
export async function changePasswordRequest(
  accessToken: string,
  currentPassword: string,
  newPassword: string
): Promise<ApiResult<{ message: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ currentPassword, newPassword }),
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
    /* non-JSON */
  }

  if (!res.ok) {
    return {
      ok: false,
      message: apiErrorMessage(data, res.status, "Could not update password"),
    };
  }

  const message =
    (typeof data.message === "string" && data.message) || "Password updated";
  return { ok: true, data: { message } };
}

/** POST /api/auth/forgot-password — { email } */
export async function forgotPasswordRequest(
  email: string
): Promise<ApiResult<{ message: string }>> {
  const trimmed = email.trim();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
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
    /* non-JSON */
  }

  if (!res.ok) {
    return {
      ok: false,
      message: apiErrorMessage(data, res.status, "Could not send reset code"),
    };
  }

  const message =
    (typeof data.message === "string" && data.message) ||
    "If that email exists, a reset code has been sent.";
  return { ok: true, data: { message } };
}

/** POST /api/auth/reset-password — { email, otp, new_password } */
export async function resetPasswordRequest(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<ApiResult<{ message: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email.trim(),
        otp: input.otp.trim(),
        new_password: input.newPassword,
      }),
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
    /* non-JSON */
  }

  if (!res.ok) {
    return {
      ok: false,
      message: apiErrorMessage(data, res.status, "Could not reset password"),
    };
  }

  const message =
    (typeof data.message === "string" && data.message) ||
    "Password updated. You can sign in with your new password.";
  return { ok: true, data: { message } };
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
