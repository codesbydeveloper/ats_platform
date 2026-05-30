"use client";

import { useEffect } from "react";

import { applySiteBrandingToDocument } from "@/lib/site-branding";
import { useAuthStore } from "@/store/auth-store";
import { useBrandingStore } from "@/store/branding-store";

/** Keeps favicon/title in sync and refreshes branding when signed in. */
export function BrandingSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const branding = useBrandingStore((s) => s.branding);
  const refreshFromApi = useBrandingStore((s) => s.refreshFromApi);

  useEffect(() => {
    applySiteBrandingToDocument(branding);
  }, [branding]);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;
    void refreshFromApi(accessToken);
  }, [hasHydrated, accessToken, refreshFromApi]);

  return null;
}
