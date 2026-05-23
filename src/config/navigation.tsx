import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  LayoutDashboard,
  ListTree,
  Settings,
  Tags,
} from "lucide-react";

export const MAIN_NAV_LINKS: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/categories", label: "Filter lists", icon: Tags },
  { href: "/form-builder", label: "Form builder", icon: ListTree },
  { href: "/settings", label: "Settings", icon: Settings },
];
