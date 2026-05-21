"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
import { updateProfileRequest } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth-store";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Display name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
});

export function ProfileSettingsCard() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  const baselineName = user?.name ?? "";
  const baselineEmail = user?.email ?? "";
  const isDirty = name !== baselineName || email !== baselineEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ name, email });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Check your profile fields.";
      toast.error("Could not save profile", { description: msg });
      return;
    }

    if (!accessToken) {
      toast.error("Sign in required", {
        description: "Sign in again to save your profile.",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfileRequest(accessToken, parsed.data);
      if (!result.ok) {
        toast.error("Could not save profile", { description: result.message });
        return;
      }
      setUser(result.data.user);
      toast.success("Profile saved", {
        description: "Your display name and email are updated on the server.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setName(baselineName);
    setEmail(baselineEmail);
  };

  if (!user) {
    return null;
  }

  const fieldsDisabled = saving;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          Profile
        </CardTitle>
        <CardDescription>
          Update your display name and email on your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
              disabled={fieldsDisabled}
            />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@school.edu"
              disabled={fieldsDisabled}
            />
          </div>
          {user.number ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-number">Phone number</Label>
              <Input
                id="profile-number"
                value={user.number}
                readOnly
                disabled
                className="bg-muted/40"
              />
              <p className="text-xs text-muted-foreground">
                From your account (not editable here).
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={!isDirty || fieldsDisabled}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || fieldsDisabled}
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
