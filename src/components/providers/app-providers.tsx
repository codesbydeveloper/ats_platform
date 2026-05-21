"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStoresHydrated } from "@/hooks/use-stores-hydrated";
import { useUiStore } from "@/store/ui-store";

function ThemePreferenceSync() {
  const preference = useUiStore((s) => s.themePreference);
  const { setTheme } = useTheme();

  React.useEffect(() => {
    setTheme(preference);
  }, [preference, setTheme]);

  return null;
}

function HydrationFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-2 w-48 rounded-full" />
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useStoresHydrated();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={200}>
        {hydrated ? (
          <>
            <ThemePreferenceSync />
            <AuthSessionSync />
            {children}
          </>
        ) : (
          <HydrationFallback />
        )}
        <Toaster richColors position="top-right" closeButton />
      </TooltipProvider>
    </NextThemesProvider>
  );
}
