"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, LayoutDashboard, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            ATS Teachers
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Button
                key={href}
                variant={active ? "secondary" : "ghost"}
                className={cn("justify-start gap-2", active && "shadow-sm")}
                asChild
                onClick={() => setOpen(false)}
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <Separator />
        <p className="p-4 text-xs text-muted-foreground">
          Navigate across your hiring workspace.
        </p>
      </SheetContent>
    </Sheet>
  );
}

export function MobileSidebarTrigger() {
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background md:hidden"
      onClick={() => setOpen(true)}
      aria-label="Open navigation"
    >
      <motion.span
        animate={{ rotate: 0 }}
        className="flex flex-col gap-1"
      >
        <span className="block h-0.5 w-4 rounded-full bg-foreground" />
        <span className="block h-0.5 w-4 rounded-full bg-foreground" />
        <span className="block h-0.5 w-4 rounded-full bg-foreground" />
      </motion.span>
    </motion.button>
  );
}
