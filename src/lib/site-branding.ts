import { TREE_LEARNING_LOGO_SRC } from "@/config/brand";
import { resolveSettingsAssetUrl } from "@/lib/settings-assets";
import { SETTING_KEYS } from "@/types/app-settings";

export type SiteBranding = {
  loginLogoUrl: string;
  faviconUrl: string;
  loginHeading: string;
  loginDescription: string;
  copyrightName: string;
  copyrightYear: string;
  siteName: string;
};

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  loginLogoUrl: TREE_LEARNING_LOGO_SRC,
  faviconUrl: TREE_LEARNING_LOGO_SRC,
  loginHeading: "Tree Learning ATS",
  loginDescription:
    "Manage teachers, imports, and hiring lists in one place.",
  copyrightName: "Tree Learning",
  copyrightYear: String(new Date().getFullYear()),
  siteName: "Tree Learning",
};

function pick(map: Map<string, string>, key: string, fallback: string): string {
  const v = map.get(key)?.trim();
  return v && v.length > 0 ? v : fallback;
}

export function brandingFromSettingsMap(
  map: Map<string, string>
): SiteBranding {
  return {
    loginLogoUrl: pick(
      map,
      SETTING_KEYS.LOGIN_LOGO_URL,
      DEFAULT_SITE_BRANDING.loginLogoUrl
    ),
    faviconUrl: pick(
      map,
      SETTING_KEYS.FAVICON_URL,
      DEFAULT_SITE_BRANDING.faviconUrl
    ),
    loginHeading: pick(
      map,
      SETTING_KEYS.LOGIN_HEADING,
      DEFAULT_SITE_BRANDING.loginHeading
    ),
    loginDescription: pick(
      map,
      SETTING_KEYS.LOGIN_DESCRIPTION,
      DEFAULT_SITE_BRANDING.loginDescription
    ),
    copyrightName: pick(
      map,
      SETTING_KEYS.COPYRIGHT_NAME,
      DEFAULT_SITE_BRANDING.copyrightName
    ),
    copyrightYear: pick(
      map,
      SETTING_KEYS.COPYRIGHT_YEAR,
      DEFAULT_SITE_BRANDING.copyrightYear
    ),
    siteName: pick(map, SETTING_KEYS.SITE_NAME, DEFAULT_SITE_BRANDING.siteName),
  };
}

export function mergeSiteBranding(
  current: SiteBranding,
  patch: Partial<SiteBranding>
): SiteBranding {
  return {
    loginLogoUrl: patch.loginLogoUrl?.trim() || current.loginLogoUrl,
    faviconUrl: patch.faviconUrl?.trim() || current.faviconUrl,
    loginHeading: patch.loginHeading?.trim() || current.loginHeading,
    loginDescription:
      patch.loginDescription?.trim() || current.loginDescription,
    copyrightName: patch.copyrightName?.trim() || current.copyrightName,
    copyrightYear: patch.copyrightYear?.trim() || current.copyrightYear,
    siteName: patch.siteName?.trim() || current.siteName,
  };
}

/** Update favicon and document title in the browser. */
export function applySiteBrandingToDocument(branding: SiteBranding) {
  if (typeof document === "undefined") return;

  const faviconRaw =
    branding.faviconUrl.trim() || branding.loginLogoUrl.trim() || "";
  const faviconHref = faviconRaw ? resolveSettingsAssetUrl(faviconRaw) : "";
  if (faviconHref) {
    for (const rel of ["icon", "shortcut icon", "apple-touch-icon"]) {
      let link = document.querySelector<HTMLLinkElement>(
        `link[rel="${rel}"]`
      );
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = faviconHref;
    }
  }

  const titleBase = branding.siteName.trim() || branding.loginHeading.trim();
  if (titleBase) {
    document.title = `${titleBase} | Teacher management`;
  }
}
