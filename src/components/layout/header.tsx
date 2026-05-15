"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

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
import { useAuthStore } from "@/store/auth-store";
import { useFilterStore } from "@/store/filter-store";
import { useUiStore } from "@/store/ui-store";

export function Header() {
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

  const icon =
    resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <MobileSidebarTrigger />
      <div className="hidden min-w-0 flex-1 md:block md:max-w-md">
        <SearchInput
          value={search}
          onValueChange={(v) => setFilters({ search: v })}
          placeholder="Search teachers, subjects, cities…"
        />
      </div>
      <div className="flex flex-1 md:hidden" />
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label="Toggle theme"
          onClick={cycleTheme}
        >
          {icon}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          onClick={() =>
            toast.message("You are caught up", {
              description: "No new notifications in this demo workspace.",
            })
          }
        >
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.name?.slice(0, 2).toUpperCase() ?? "AT"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium lg:inline">
                {user?.name ?? "Account"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="mr-2 h-4 w-4" />
              Profile & settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/login");
                toast.success("Signed out");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
