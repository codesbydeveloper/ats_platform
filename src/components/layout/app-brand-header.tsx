"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { BrandLogo } from "@/components/layout/brand-logo";
import { MobileSidebarTrigger } from "@/components/layout/mobile-sidebar";
import { SearchInput } from "@/components/shared/search-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOOKUP_MENU_ITEMS } from "@/config/lookup-menu";
import { useAuthStore } from "@/store/auth-store";
import { useFilterStore } from "@/store/filter-store";
import { useUiStore } from "@/store/ui-store";

/** Full-width top bar — logo left, centered pill search, utilities right. */
export function AppBrandHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const search = useFilterStore((s) => s.filters.search);
  const setFilters = useFilterStore((s) => s.setFilters);
  const { setTheme, resolvedTheme } = useTheme();
  const themePreference = useUiStore((s) => s.themePreference);
  const setThemePreference = useUiStore((s) => s.setThemePreference);

  const cycleTheme = () => {
    const order = ["light", "dark", "system"] as const;
    const idx = order.indexOf(
      (themePreference ?? "system") as (typeof order)[number]
    );
    const next = order[(idx + 1) % order.length]!;
    setThemePreference(next);
    setTheme(next);
  };

  const themeIcon =
    resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  const accountLabel = "Tree Learning";

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border/70 bg-background shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex h-14 items-center gap-3 px-4 md:h-16 md:gap-4 md:px-6">
        {/* Left: menu + logo */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <MobileSidebarTrigger className="md:hidden" />
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Tree Learning home"
          >
            <BrandLogo variant="header" />
          </Link>
        </div>

        {/* Center: wide pill search */}
        <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-4 md:px-8">
          <div className="w-full max-w-xl lg:max-w-2xl">
            <SearchInput
              variant="header"
              value={search}
              onValueChange={(v) => setFilters({ search: v })}
              placeholder="Search teachers, subjects, cities…"
            />
          </div>
        </div>

        {/* Right: theme, notifications, profile */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
            onClick={cycleTheme}
          >
            {themeIcon}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                className="h-9 gap-2 rounded-md bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary/90 sm:px-3"
              >
                <Avatar className="h-7 w-7 ring-1 ring-primary-foreground/30">
                  <AvatarFallback className="bg-primary-foreground/15 text-xs font-semibold text-primary-foreground">
                    TL
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
                  {accountLabel}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 py-1">
              {user ? (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              {LOOKUP_MENU_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.slug}
                  className="cursor-pointer py-2.5 text-sm"
                  onClick={() => router.push(`/lookup/${item.slug}`)}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer py-2.5 text-sm text-destructive focus:text-destructive"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                  toast.success("Signed out");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
