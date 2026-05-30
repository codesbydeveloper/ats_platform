"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { BrandingImageUploadField } from "@/components/settings/branding-image-upload-field";
import { resolveSettingsAssetUrl } from "@/lib/settings-assets";
import { DEFAULT_SITE_BRANDING } from "@/lib/site-branding";
import { getSettingsRequest, updateSettingsRequest } from "@/lib/settings-api";
import type { SiteBranding } from "@/lib/site-branding";
import { SETTING_KEYS } from "@/types/app-settings";
import { useAuthStore } from "@/store/auth-store";
import { useBrandingStore } from "@/store/branding-store";

export function BrandingSettingsCard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const applyBranding = useBrandingStore((s) => s.applyBranding);
  const [form, setForm] = useState<SiteBranding>({ ...DEFAULT_SITE_BRANDING });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fieldsDisabled = loading || saving || !accessToken;

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setForm({ ...DEFAULT_SITE_BRANDING });
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
    setForm({ ...result.data.branding });
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = <K extends keyof SiteBranding>(key: K, value: SiteBranding[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error("Sign in required");
      return;
    }

    setSaving(true);
    const result = await updateSettingsRequest(accessToken, {
      branding: form,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error("Could not save branding", { description: result.message });
      return;
    }

    const saved = { ...form };
    setLoadError(null);
    setForm(saved);
    applyBranding(saved);
    toast.success("Login screen branding saved");
  };

  const logoPreview = form.loginLogoUrl.trim()
    ? resolveSettingsAssetUrl(form.loginLogoUrl)
    : resolveSettingsAssetUrl(DEFAULT_SITE_BRANDING.loginLogoUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutTemplate className="h-4 w-4" />
          Login screen & branding
        </CardTitle>
        <CardDescription>
          Upload logo and favicon as files (stored on the server), plus login
          text and copyright — saved as{" "}
          <code className="text-xs">settings</code> key-value rows on the API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <SettingsLoadNotice message={loadError} />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading branding…</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <BrandingImageUploadField
              id="login-logo-upload"
              label="Login logo image"
              settingKey={SETTING_KEYS.LOGIN_LOGO_URL}
              value={form.loginLogoUrl}
              onChange={(url) => patch("loginLogoUrl", url)}
              disabled={fieldsDisabled}
            />
            <BrandingImageUploadField
              id="favicon-upload"
              label="Favicon"
              settingKey={SETTING_KEYS.FAVICON_URL}
              value={form.faviconUrl}
              onChange={(url) => patch("faviconUrl", url)}
              disabled={fieldsDisabled}
              hint="ICO, PNG, or other small image. Uploaded via POST /api/settings/image."
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="login-heading">Login heading</Label>
              <Input
                id="login-heading"
                value={form.loginHeading}
                onChange={(e) => patch("loginHeading", e.target.value)}
                placeholder="Tree Learning ATS"
                disabled={fieldsDisabled}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="login-description">Description</Label>
              <Textarea
                id="login-description"
                rows={2}
                value={form.loginDescription}
                onChange={(e) => patch("loginDescription", e.target.value)}
                disabled={fieldsDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copyright-name">Copyright name</Label>
              <Input
                id="copyright-name"
                value={form.copyrightName}
                onChange={(e) => patch("copyrightName", e.target.value)}
                placeholder="Tree Learning"
                disabled={fieldsDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copyright-year">Copyright year</Label>
              <Input
                id="copyright-year"
                value={form.copyrightYear}
                onChange={(e) => patch("copyrightYear", e.target.value)}
                placeholder="2026"
                disabled={fieldsDisabled}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="site-name">Site name (browser tab)</Label>
              <Input
                id="site-name"
                value={form.siteName}
                onChange={(e) => patch("siteName", e.target.value)}
                placeholder="Tree Learning"
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4" />
              Preview
            </p>
            <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
              <div className="inline-flex rounded-lg bg-white px-2 py-1 dark:ring-1 dark:ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt=""
                  className="h-10 w-auto max-w-[200px] object-contain"
                />
              </div>
              <div>
                <p className="text-lg font-semibold">{form.loginHeading}</p>
                <p className="text-sm text-muted-foreground">
                  {form.loginDescription}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                © {form.copyrightYear} {form.copyrightName}
              </p>
            </div>
          </div>

          <Button type="submit" disabled={fieldsDisabled}>
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
