"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        "hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col",
        className
      )}
    >
      <ScrollArea className="min-h-0 flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {MAIN_NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/15"
                      : "text-muted-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active && "text-primary"
                    )}
                  />
                  {!collapsed ? (
                    <span className="truncate">{label}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="mt-auto space-y-2 border-t border-sidebar-border p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("w-full", collapsed ? "mx-auto" : "ml-auto")}
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
        {!collapsed ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Teacher hiring workspace
          </p>
        ) : null}
      </div>
    </motion.aside>
  );
}
