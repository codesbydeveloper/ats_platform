"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminLayout } from "@/components/layout/admin-layout";
import { useAuthStore } from "@/store/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [router, user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
