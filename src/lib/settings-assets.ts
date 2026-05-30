import { getApiBase } from "@/lib/api-config";
import type { SettingEntry } from "@/types/app-settings";

const API_BASE = getApiBase();

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,.ico";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function brandingImageAccept(): string {
  return IMAGE_ACCEPT;
}

export function validateBrandingImageFile(file: File): string | null {
  const okType =
    file.type.startsWith("image/") ||
    file.name.toLowerCase().endsWith(".ico");
  if (!okType) {
    return "Choose a PNG, JPG, WebP, GIF, or ICO image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

/** Turn API storage path into a URL the browser can load (may be on API host). */
export function resolveSettingsAssetUrl(pathOrUrl: string): string {
  const v = pathOrUrl.trim();
  if (!v) return v;
  if (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("data:") ||
    v.startsWith("blob:")
  ) {
    return v;
  }
  if (v.startsWith("/")) return `${API_BASE}${v}`;
  return `${API_BASE}/${v}`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseSettingsArray(data: unknown): SettingEntry[] {
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

export function looksLikeAssetPath(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 500) return false;
  if (v.startsWith("http://") || v.startsWith("https://")) return true;
  return (
    v.startsWith("/uploads/") ||
    v.startsWith("/storage/") ||
    v.startsWith("/public/") ||
    v.startsWith("/media/") ||
    (v.startsWith("/") && /\.(png|jpe?g|webp|gif|ico|svg)(\?|$)/i.test(v))
  );
}

function collectPathStrings(value: unknown, depth = 0): string[] {
  if (depth > 6) return [];
  if (typeof value === "string") {
    return looksLikeAssetPath(value) ? [value.trim()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPathStrings(item, depth + 1));
  }
  const rec = asRecord(value);
  if (!rec) return [];
  return Object.values(rec).flatMap((v) => collectPathStrings(v, depth + 1));
}

/** Extract stored path/URL from upload / settings API response. */
export function extractUploadedAssetUrl(
  data: unknown,
  settingKey: string
): string | null {
  const fromSettings = parseSettingsArray(data).find((s) => s.key === settingKey);
  if (fromSettings?.value.trim()) return fromSettings.value.trim();

  const root = asRecord(data);
  if (!root) return null;

  if (typeof root[settingKey] === "string" && root[settingKey].trim()) {
    return String(root[settingKey]).trim();
  }

  const candidates: unknown[] = [
    root.url,
    root.path,
    root.file_path,
    root.filePath,
    root.file_url,
    root.fileUrl,
    root.image,
    root.image_url,
    root.imageUrl,
    root.location,
    root.src,
    root.filename,
  ];

  const dataRec = asRecord(root.data);
  if (dataRec) {
    if (typeof dataRec[settingKey] === "string") {
      candidates.push(dataRec[settingKey]);
    }
    candidates.push(
      dataRec.url,
      dataRec.path,
      dataRec.file_path,
      dataRec.filePath,
      dataRec.file_url,
      dataRec.image,
      dataRec.image_url
    );
  }

  const fileRec = asRecord(root.file);
  if (fileRec) {
    candidates.push(fileRec.url, fileRec.path, fileRec.file_path);
  }

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  const deepPaths = collectPathStrings(data);
  if (deepPaths.length > 0) return deepPaths[0]!;

  return null;
}
