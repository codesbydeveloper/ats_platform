"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Palette, Sun } from "lucide-react";

import { BrandingSettingsCard } from "@/components/settings/branding-settings-card";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { OpenAiSettingsCard } from "@/components/settings/openai-settings-card";
import { ProfileSettingsCard } from "@/components/settings/profile-settings-card";
import { SmtpSettingsCard } from "@/components/settings/smtp-settings-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUiStore, type ThemePreference } from "@/store/ui-store";

const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const SECTION_LINKS = [
  { href: "#profile", label: "Profile" },
  { href: "#change-password", label: "Change password" },
  { href: "#branding", label: "Branding" },
  { href: "#openai", label: "OpenAI" },
  { href: "#smtp", label: "SMTP" },
  { href: "#theme", label: "Theme" },
] as const;

const sectionScrollClass = "scroll-mt-24";

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const themePreference = useUiStore((s) => s.themePreference);
  const setThemePreference = useUiStore((s) => s.setThemePreference);

  const applyTheme = (pref: ThemePreference) => {
    setThemePreference(pref);
    setTheme(pref);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <PageHeader
        title="Settings"
        description="Profile, login branding, integrations, password, and theme."
      >
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Jump to a settings section"
        >
          {SECTION_LINKS.map(({ href, label }) => (
            <Button key={href} variant="outline" size="sm" asChild>
              <a href={href}>{label}</a>
            </Button>
          ))}
        </nav>
      </PageHeader>

      <section id="profile" className={sectionScrollClass}>
        <ProfileSettingsCard />
      </section>

      <section id="change-password" className={sectionScrollClass}>
        <ChangePasswordCard />
      </section>

      <section id="branding" className={sectionScrollClass}>
        <BrandingSettingsCard />
      </section>

      <section id="openai" className={sectionScrollClass}>
        <OpenAiSettingsCard />
      </section>

      <section id="smtp" className={sectionScrollClass}>
        <SmtpSettingsCard />
      </section>

      <section id="theme" className={sectionScrollClass}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Theme
            </CardTitle>
            <CardDescription>Controls light, dark, or system appearance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={themePreference === value ? "default" : "outline"}
                className="gap-2"
                onClick={() => applyTheme(value)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
