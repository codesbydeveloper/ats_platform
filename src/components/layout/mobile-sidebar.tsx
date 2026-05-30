"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { MAIN_NAV_LINKS } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useBrandingStore } from "@/store/branding-store";
import { useUiStore } from "@/store/ui-store";

export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const pathname = usePathname();
  const branding = useBrandingStore((s) => s.branding);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <BrandLogo
            variant="sheet"
            logoSrc={branding.loginLogoUrl}
            alt={branding.siteName}
          />
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {MAIN_NAV_LINKS.map(({ href, label, icon: Icon }) => {
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

export function MobileSidebarTrigger({
  className,
}: {
  className?: string;
}) {
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type="button"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background md:hidden",
        className
      )}
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
