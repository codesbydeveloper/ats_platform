"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminLayout } from "@/components/layout/admin-layout";
import { useStoresHydrated } from "@/hooks/use-stores-hydrated";
import { useAuthStore } from "@/store/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useStoresHydrated();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
    }
  }, [router, user, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
