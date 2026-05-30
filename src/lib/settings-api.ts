import { getApiBase } from "@/lib/api-config";
import {
  extractUploadedAssetUrl,
  looksLikeAssetPath,
  resolveSettingsAssetUrl,
} from "@/lib/settings-assets";
import {
  brandingFromSettingsMap,
  DEFAULT_SITE_BRANDING,
  mergeSiteBranding,
  type SiteBranding,
} from "@/lib/site-branding";
import type {
  AppSettings,
  SendTestEmailInput,
  SettingEntry,
  SettingsPayload,
  SmtpEncryption,
  UpdateAppSettingsInput,
} from "@/types/app-settings";
import { SETTING_KEYS } from "@/types/app-settings";

const API_BASE = getApiBase();

const KNOWN_SETTING_KEYS = new Set<string>(Object.values(SETTING_KEYS));

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function bearerOnly(accessToken: string | null): HeadersInit {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
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

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeEncryption(raw: unknown): SmtpEncryption {
  const v = String(raw ?? "tls").toLowerCase();
  if (v === "ssl" || v === "none") return v;
  return "tls";
}

function truthySettingValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Parse `{ settings: [{ key, value }] }` from API response. */
export function parseSettingsArray(data: unknown): SettingEntry[] {
  const root = asRecord(data);
  if (!root) return [];

  let raw = root.settings;
  if (!Array.isArray(raw)) {
    const inner = asRecord(root.data);
    if (Array.isArray(inner?.settings)) raw = inner.settings;
  }
  if (!Array.isArray(raw)) return [];

  const out: SettingEntry[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const key = String(row.key ?? "").trim();
    if (!key) continue;
    out.push({
      key,
      value: row.value == null ? "" : String(row.value),
    });
  }
  return out;
}

export function settingsArrayToMap(
  entries: SettingEntry[]
): Map<string, string> {
  return new Map(entries.map((e) => [e.key, e.value]));
}

function mapGet(map: Map<string, string>, key: string): string {
  return map.get(key)?.trim() ?? "";
}

function mapBool(map: Map<string, string>, key: string): boolean {
  return truthySettingValue(mapGet(map, key));
}

function boolConfigured(
  rec: Record<string, unknown>,
  ...keys: string[]
): boolean {
  for (const key of keys) {
    const v = rec[key];
    if (v === true || v === 1 || v === "1") return true;
  }
  return false;
}

/** Build `AppSettings` from a flat record (legacy) or settings map. */
export function normalizeAppSettings(data: unknown): AppSettings {
  const entries = parseSettingsArray(data);
  if (entries.length > 0) {
    return normalizeAppSettingsFromMap(settingsArrayToMap(entries), entries);
  }

  const root = asRecord(data);
  const rec =
    asRecord(root?.data) ??
    (Array.isArray(root?.settings) ? null : root) ??
    {};

  if (!rec) {
    return emptyAppSettings();
  }

  const smtpRaw = asRecord(rec.smtp) ?? asRecord(rec.mail) ?? rec;
  const portRaw = smtpRaw.smtp_port ?? smtpRaw.port ?? 587;
  const port =
    typeof portRaw === "number"
      ? portRaw
      : Number.parseInt(String(portRaw), 10) || 587;

  const openaiKey =
    (typeof rec.openai_api_key === "string" && rec.openai_api_key) ||
    (typeof rec.openaiApiKey === "string" && rec.openaiApiKey) ||
    "";

  const smtpPassword =
    (typeof smtpRaw.smtp_password === "string" && smtpRaw.smtp_password) ||
    (typeof smtpRaw.password === "string" && smtpRaw.password) ||
    "";

  return {
    openaiApiKey: openaiKey,
    openaiApiKeyConfigured:
      openaiKey.length > 0 ||
      boolConfigured(
        rec,
        SETTING_KEYS.OPENAI_API_KEY_SET,
        "openaiApiKeySet",
        "has_openai_api_key"
      ),
    smtp: {
      host: String(smtpRaw.smtp_host ?? smtpRaw.host ?? "").trim(),
      port,
      username: String(smtpRaw.smtp_username ?? smtpRaw.username ?? "").trim(),
      password: smtpPassword,
      passwordConfigured:
        smtpPassword.length > 0 ||
        boolConfigured(
          smtpRaw,
          SETTING_KEYS.SMTP_PASSWORD_SET,
          "password_set",
          "smtpPasswordSet",
          "has_smtp_password"
        ),
      encryption: normalizeEncryption(
        smtpRaw.smtp_encryption ?? smtpRaw.encryption
      ),
      fromEmail: String(
        smtpRaw.smtp_from_email ?? smtpRaw.from_email ?? smtpRaw.fromEmail ?? ""
      ).trim(),
      fromName: String(
        smtpRaw.smtp_from_name ?? smtpRaw.from_name ?? smtpRaw.fromName ?? ""
      ).trim(),
    },
    branding: DEFAULT_SITE_BRANDING,
    extra: [],
  };
}

function emptyAppSettings(): AppSettings {
  return {
    openaiApiKey: "",
    openaiApiKeyConfigured: false,
    smtp: {
      host: "",
      port: 587,
      username: "",
      password: "",
      passwordConfigured: false,
      encryption: "tls",
      fromEmail: "",
      fromName: "",
    },
    branding: { ...DEFAULT_SITE_BRANDING },
    extra: [],
  };
}

function normalizeAppSettingsFromMap(
  map: Map<string, string>,
  allEntries: SettingEntry[]
): AppSettings {
  const openaiKey = mapGet(map, SETTING_KEYS.OPENAI_API_KEY);
  const smtpPassword = mapGet(map, SETTING_KEYS.SMTP_PASSWORD);
  const portRaw = mapGet(map, SETTING_KEYS.SMTP_PORT) || "587";
  const port = Number.parseInt(portRaw, 10) || 587;

  const extra = allEntries.filter(
    (e) => !KNOWN_SETTING_KEYS.has(e.key) && !e.key.endsWith("_set")
  );

  return {
    openaiApiKey: openaiKey,
    openaiApiKeyConfigured:
      openaiKey.length > 0 ||
      mapBool(map, SETTING_KEYS.OPENAI_API_KEY_SET),
    smtp: {
      host: mapGet(map, SETTING_KEYS.SMTP_HOST),
      port,
      username: mapGet(map, SETTING_KEYS.SMTP_USERNAME),
      password: smtpPassword,
      passwordConfigured:
        smtpPassword.length > 0 ||
        mapBool(map, SETTING_KEYS.SMTP_PASSWORD_SET),
      encryption: normalizeEncryption(
        mapGet(map, SETTING_KEYS.SMTP_ENCRYPTION) || "tls"
      ),
      fromEmail: mapGet(map, SETTING_KEYS.SMTP_FROM_EMAIL),
      fromName: mapGet(map, SETTING_KEYS.SMTP_FROM_NAME),
    },
    branding: brandingFromSettingsMap(map),
    extra,
  };
}

function pushEntry(
  list: SettingEntry[],
  key: string,
  value: string | number | undefined
) {
  if (value === undefined) return;
  list.push({ key, value: String(value) });
}

/** Build POST/PATCH body: `{ settings: [{ key, value }, …] }`. */
export function buildSettingsPayload(
  input: UpdateAppSettingsInput
): SettingsPayload {
  const settings: SettingEntry[] = [];

  if (input.openaiApiKey !== undefined) {
    pushEntry(settings, SETTING_KEYS.OPENAI_API_KEY, input.openaiApiKey);
    if (input.openaiApiKey.trim()) {
      pushEntry(settings, SETTING_KEYS.OPENAI_API_KEY_SET, "1");
    }
  }

  if (input.smtp) {
    const s = input.smtp;
    pushEntry(settings, SETTING_KEYS.SMTP_HOST, s.host);
    pushEntry(settings, SETTING_KEYS.SMTP_PORT, s.port);
    pushEntry(settings, SETTING_KEYS.SMTP_USERNAME, s.username);
    pushEntry(settings, SETTING_KEYS.SMTP_PASSWORD, s.password);
    pushEntry(settings, SETTING_KEYS.SMTP_ENCRYPTION, s.encryption);
    pushEntry(settings, SETTING_KEYS.SMTP_FROM_EMAIL, s.fromEmail);
    pushEntry(settings, SETTING_KEYS.SMTP_FROM_NAME, s.fromName);
    if (s.password?.trim()) {
      pushEntry(settings, SETTING_KEYS.SMTP_PASSWORD_SET, "1");
    }
  }

  if (input.branding) {
    const b = input.branding;
    pushEntry(settings, SETTING_KEYS.LOGIN_LOGO_URL, b.loginLogoUrl);
    pushEntry(settings, SETTING_KEYS.FAVICON_URL, b.faviconUrl);
    pushEntry(settings, SETTING_KEYS.LOGIN_HEADING, b.loginHeading);
    pushEntry(settings, SETTING_KEYS.LOGIN_DESCRIPTION, b.loginDescription);
    pushEntry(settings, SETTING_KEYS.COPYRIGHT_NAME, b.copyrightName);
    pushEntry(settings, SETTING_KEYS.COPYRIGHT_YEAR, b.copyrightYear);
    pushEntry(settings, SETTING_KEYS.SITE_NAME, b.siteName);
  }

  if (input.extra?.length) {
    for (const row of input.extra) {
      const key = row.key.trim();
      if (!key) continue;
      settings.push({ key, value: row.value });
    }
  }

  return { settings };
}

/** Apply values the client just sent when POST body omits them in the response. */
function mergeSavedInput(
  settings: AppSettings,
  input: UpdateAppSettingsInput
): AppSettings {
  let next = settings;

  if (input.openaiApiKey !== undefined) {
    next = {
      ...next,
      openaiApiKey: input.openaiApiKey,
      openaiApiKeyConfigured:
        input.openaiApiKey.trim().length > 0 || next.openaiApiKeyConfigured,
    };
  }

  if (input.smtp) {
    const s = input.smtp;
    next = {
      ...next,
      smtp: {
        ...next.smtp,
        host: s.host ?? next.smtp.host,
        port: s.port ?? next.smtp.port,
        username: s.username ?? next.smtp.username,
        password: s.password ?? next.smtp.password,
        encryption: s.encryption ?? next.smtp.encryption,
        fromEmail: s.fromEmail ?? next.smtp.fromEmail,
        fromName: s.fromName ?? next.smtp.fromName,
        passwordConfigured:
          (s.password?.trim().length ?? 0) > 0 || next.smtp.passwordConfigured,
      },
    };
  }

  if (input.branding) {
    next = {
      ...next,
      branding: mergeSiteBranding(next.branding, input.branding),
    };
  }

  return next;
}

/** Load branding for login screen (no auth required if API allows). */
export async function fetchBrandingSettingsRequest(): Promise<
  ApiResult<SiteBranding>
> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/settings`);
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

  return { ok: true, data: normalizeAppSettings(data).branding };
}

/** GET /api/settings */
export async function getSettingsRequest(
  accessToken: string | null
): Promise<ApiResult<AppSettings>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/settings`, {
      headers: authHeaders(accessToken ?? ""),
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

  return { ok: true, data: normalizeAppSettings(data) };
}

/** POST /api/settings — body `{ settings: [{ key, value }] }` */
export async function updateSettingsRequest(
  accessToken: string | null,
  input: UpdateAppSettingsInput
): Promise<ApiResult<AppSettings>> {
  const body = buildSettingsPayload(input);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/settings`, {
      method: "POST",
      headers: authHeaders(accessToken ?? ""),
      body: JSON.stringify(body),
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

  let settings = mergeSavedInput(normalizeAppSettings(data), input);

  if (parseSettingsArray(data).length === 0 && accessToken) {
    const refreshed = await getSettingsRequest(accessToken);
    if (refreshed.ok) {
      settings = mergeSavedInput(refreshed.data, input);
    }
  }

  return { ok: true, data: settings };
}

/** POST /api/smtp/test */
export async function sendTestEmailRequest(
  accessToken: string | null,
  input: SendTestEmailInput
): Promise<ApiResult<{ message?: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/smtp/test`, {
      method: "POST",
      headers: authHeaders(accessToken ?? ""),
      body: JSON.stringify({ email: input.email.trim() }),
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

  const rec = asRecord(data);
  const message =
    (rec && typeof rec.message === "string" && rec.message) ||
    "Test email sent.";
  return { ok: true, data: { message } };
}

export type SettingsFileUploadKey =
  | typeof SETTING_KEYS.LOGIN_LOGO_URL
  | typeof SETTING_KEYS.FAVICON_URL;

export type SettingsFileUploadResult = {
  /** Path or URL stored in settings (e.g. `/storage/branding/logo.png`). */
  url: string;
  settingKey: SettingsFileUploadKey;
};

function brandingPathFromSettings(
  settings: AppSettings,
  settingKey: SettingsFileUploadKey
): string {
  return settingKey === SETTING_KEYS.LOGIN_LOGO_URL
    ? settings.branding.loginLogoUrl
    : settings.branding.faviconUrl;
}

/**
 * POST /api/settings/image (or /api/settings) — multipart `file` + `key`.
 * Same settings API as text saves; response may be `{ settings: [...] }` or a path.
 */
export async function uploadSettingsFileRequest(
  accessToken: string | null,
  file: File,
  settingKey: SettingsFileUploadKey
): Promise<ApiResult<SettingsFileUploadResult>> {
  if (!accessToken) {
    return { ok: false, message: "Sign in required to upload files." };
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("key", settingKey);

  const endpoints = [
    `${API_BASE}/api/settings/image`,
    `${API_BASE}/api/settings`,
  ];

  let lastMessage = "Could not upload file.";

  for (const endpoint of endpoints) {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: bearerOnly(accessToken),
        body: formData,
      });
    } catch {
      lastMessage = `Could not reach API at ${API_BASE}.`;
      continue;
    }

    const data = await parseJson(res);
    if (!res.ok) {
      lastMessage = apiErrorMessage(data, res.status);
      continue;
    }

    let url = extractUploadedAssetUrl(data, settingKey);

    if (!url) {
      const refreshed = await getSettingsRequest(accessToken);
      if (refreshed.ok) {
        const fromSettings = brandingPathFromSettings(
          refreshed.data,
          settingKey
        );
        if (fromSettings.trim() && looksLikeAssetPath(fromSettings)) {
          url = fromSettings.trim();
        }
      }
    }

    if (!url) {
      lastMessage =
        "Upload succeeded but the server did not return a file URL or path.";
      continue;
    }

    return { ok: true, data: { url, settingKey } };
  }

  return { ok: false, message: lastMessage };
}

export { resolveSettingsAssetUrl };
