"use client";

import { useEffect, useRef } from "react";

import { useAuthStore } from "@/store/auth-store";

/** After hydration, load the signed-in user from GET /api/auth/me. */
export function AuthSessionSync() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;
    if (syncedRef.current === accessToken) return;
    syncedRef.current = accessToken;
    void refreshSession();
  }, [hasHydrated, accessToken, refreshSession]);

  useEffect(() => {
    if (!accessToken) syncedRef.current = null;
  }, [accessToken]);

  return null;
}
