"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SettingsLoadNotice } from "@/components/settings/settings-load-notice";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  getSettingsRequest,
  sendTestEmailRequest,
  updateSettingsRequest,
} from "@/lib/settings-api";
import { useAuthStore } from "@/store/auth-store";
import type { SmtpEncryption } from "@/types/app-settings";

const smtpSchema = z.object({
  host: z.string().trim().min(1, "SMTP host is required"),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim().optional(),
  password: z.string().optional(),
  encryption: z.enum(["tls", "ssl", "none"]),
  fromEmail: z.string().trim().email("Enter a valid from email"),
  fromName: z.string().trim().min(1, "From name is required"),
});

const testEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid recipient email"),
});

type SmtpFormState = {
  host: string;
  port: string;
  username: string;
  password: string;
  encryption: SmtpEncryption;
  fromEmail: string;
  fromName: string;
};

const emptySmtp: SmtpFormState = {
  host: "",
  port: "587",
  username: "",
  password: "",
  encryption: "tls",
  fromEmail: "",
  fromName: "",
};

export function SmtpSettingsCard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<SmtpFormState>(emptySmtp);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState(user?.email ?? "");

  const fieldsDisabled = loading || saving || !accessToken;

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const result = await getSettingsRequest(accessToken);
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    const { smtp } = result.data;
    setPasswordConfigured(smtp.passwordConfigured);
    setForm({
      host: smtp.host,
      port: String(smtp.port || 587),
      username: smtp.username,
      password: smtp.password,
      encryption: smtp.encryption,
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName,
    });
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (user?.email) setTestTo(user.email);
  }, [user?.email]);

  const patchField = <K extends keyof SmtpFormState>(
    key: K,
    value: SmtpFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error("Sign in required");
      return;
    }

    const parsed = smtpSchema.safeParse({
      ...form,
      port: form.port,
    });
    if (!parsed.success) {
      toast.error("Check SMTP fields", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    if (!passwordConfigured && !form.password.trim()) {
      toast.error("Enter SMTP password", {
        description: "Required when saving for the first time.",
      });
      return;
    }

    setSaving(true);
    const payload: Parameters<typeof updateSettingsRequest>[1] = {
      smtp: {
        host: parsed.data.host,
        port: parsed.data.port,
        username: parsed.data.username ?? "",
        encryption: parsed.data.encryption,
        fromEmail: parsed.data.fromEmail,
        fromName: parsed.data.fromName,
      },
    };
    if (form.password.trim()) {
      payload.smtp!.password = form.password.trim();
    }

    const result = await updateSettingsRequest(accessToken, payload);
    setSaving(false);

    if (!result.ok) {
      toast.error("Could not save SMTP settings", {
        description: result.message,
      });
      return;
    }

    setLoadError(null);
    setPasswordConfigured(result.data.smtp.passwordConfigured);
    setForm((prev) => ({
      ...prev,
      password: result.data.smtp.password || "",
    }));
    toast.success("SMTP settings saved");
  };

  const handleSendTest = async () => {
    if (!accessToken) {
      toast.error("Sign in required");
      return;
    }

    const parsed = testEmailSchema.safeParse({ email: testTo });
    if (!parsed.success) {
      toast.error("Invalid test recipient", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    setTesting(true);
    const result = await sendTestEmailRequest(accessToken, {
      email: parsed.data.email,
    });
    setTesting(false);

    if (!result.ok) {
      toast.error("Test email failed", { description: result.message });
      return;
    }

    toast.success("Test email sent", {
      description: result.data.message ?? `Sent to ${parsed.data.email}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          SMTP
        </CardTitle>
        <CardDescription>
          Outgoing mail server for notifications and system emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SettingsLoadNotice message={loadError} />
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading saved SMTP…</p>
        ) : null}
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  value={form.host}
                  onChange={(e) => patchField("host", e.target.value)}
                  placeholder="smtp.example.com"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => patchField("port", e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-encryption">Encryption</Label>
                <Select
                  value={form.encryption}
                  onValueChange={(v) =>
                    patchField("encryption", v as SmtpEncryption)
                  }
                  disabled={fieldsDisabled}
                >
                  <SelectTrigger id="smtp-encryption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  value={form.username}
                  onChange={(e) => patchField("username", e.target.value)}
                  autoComplete="off"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">Password</Label>
                <div className="relative">
                  <Input
                    id="smtp-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => patchField("password", e.target.value)}
                    placeholder={
                      passwordConfigured
                        ? "Leave blank to keep current password"
                        : "SMTP password"
                    }
                    autoComplete="off"
                    disabled={fieldsDisabled}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    disabled={fieldsDisabled}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from-email">From email</Label>
                <Input
                  id="smtp-from-email"
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => patchField("fromEmail", e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from-name">From name</Label>
                <Input
                  id="smtp-from-name"
                  value={form.fromName}
                  onChange={(e) => patchField("fromName", e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={fieldsDisabled}>
                  {saving ? "Saving…" : "Save SMTP settings"}
                </Button>
              </div>
            </form>

            <Separator />

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-medium">Send test email</h3>
                <p className="text-xs text-muted-foreground">
                  Uses the saved SMTP settings on the server. Save changes first
                  if you edited the form.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="smtp-test-to">Recipient</Label>
                  <Input
                    id="smtp-test-to"
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                    disabled={testing || loading}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={testing || loading || !testTo.trim() || !accessToken}
                  onClick={() => void handleSendTest()}
                >
                  {testing ? (
                    "Sending…"
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send test mail
                    </>
                  )}
                </Button>
              </div>
            </div>
      </CardContent>
    </Card>
  );
}
