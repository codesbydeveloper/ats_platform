"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Palette, Sun, User } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore, type ThemePreference } from "@/store/ui-store";

const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { setTheme } = useTheme();
  const themePreference = useUiStore((s) => s.themePreference);
  const setThemePreference = useUiStore((s) => s.setThemePreference);

  const applyTheme = (pref: ThemePreference) => {
    setThemePreference(pref);
    setTheme(pref);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Settings"
        description="Tune how ATS Teachers feels in your browser. Everything persists locally."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Read-only snapshot from your session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" readOnly value={user?.name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" readOnly value={user?.email ?? ""} />
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
