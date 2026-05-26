/** Live ATS API — override in `.env.local` with NEXT_PUBLIC_API_URL */
export const DEFAULT_API_URL = "https://ats.raomtech.com";
// export const DEFAULT_API_URL = "http://localhost:8000";

/** Base URL for all browser API calls (no trailing slash). */
export function getApiBase(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.trim()
      : "";
  return (fromEnv || DEFAULT_API_URL).replace(/\/$/, "");
}
