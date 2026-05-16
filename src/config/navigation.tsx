import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  LayoutDashboard,
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
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];
