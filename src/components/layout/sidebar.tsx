"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAIN_NAV_LINKS } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              ATS Teachers
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Management
            </p>
          </div>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto shrink-0"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {MAIN_NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? (
                    <span className="truncate">{label}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="mt-auto border-t p-3">
        {!collapsed ? (
          <p className="text-xs text-muted-foreground">
            Enterprise-grade teacher pipeline.
          </p>
        ) : null}
      </div>
    </motion.aside>
  );
}
