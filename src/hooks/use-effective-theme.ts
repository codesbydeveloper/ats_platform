"use client";

import { useEffect, useState } from "react";

import { useUiStore, type ThemePreference } from "@/store/ui-store";

export type EffectiveTheme = "light" | "dark";

function readSystemScheme(): EffectiveTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Theme used for icons and UI hints — respects explicit light/dark preference
 * and live OS changes when preference is "system".
 */
export function useEffectiveTheme(): {
  preference: ThemePreference;
  effective: EffectiveTheme;
  mounted: boolean;
} {
  const preference = useUiStore((s) => s.themePreference);
  const [mounted, setMounted] = useState(false);
  const [systemScheme, setSystemScheme] = useState<EffectiveTheme>("light");

  useEffect(() => {
    setMounted(true);
    setSystemScheme(readSystemScheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemScheme(readSystemScheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!mounted) {
    return { preference, effective: "light", mounted: false };
  }

  if (preference === "system") {
    return {
      preference,
      /** OS scheme is source of truth for the header icon in system mode. */
      effective: systemScheme,
      mounted: true,
    };
  }

  return {
    preference,
    effective: preference === "dark" ? "dark" : "light",
    mounted: true,
  };
}
