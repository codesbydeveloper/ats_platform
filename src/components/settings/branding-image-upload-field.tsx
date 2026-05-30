"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  brandingImageAccept,
  resolveSettingsAssetUrl,
  validateBrandingImageFile,
} from "@/lib/settings-assets";
import {
  getSettingsRequest,
  uploadSettingsFileRequest,
  type SettingsFileUploadKey,
} from "@/lib/settings-api";
import { SETTING_KEYS } from "@/types/app-settings";
import { useAuthStore } from "@/store/auth-store";
import { useBrandingStore } from "@/store/branding-store";

type BrandingImageUploadFieldProps = {
  id: string;
  label: string;
  settingKey: SettingsFileUploadKey;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  hint?: string;
};

export function BrandingImageUploadField({
  id,
  label,
  settingKey,
  value,
  onChange,
  disabled,
  hint,
}: BrandingImageUploadFieldProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const applyBranding = useBrandingStore((s) => s.applyBranding);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const previewSrc =
    localPreview ||
    (value.trim() ? resolveSettingsAssetUrl(value) : "");

  const handleFile = async (file: File | null) => {
    if (!file || disabled || uploading) return;

    const validationError = validateBrandingImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    setUploading(true);
    const result = await uploadSettingsFileRequest(
      accessToken,
      file,
      settingKey
    );
    setUploading(false);

    URL.revokeObjectURL(objectUrl);
    setLocalPreview(null);

    if (!result.ok) {
      toast.error("Upload failed", { description: result.message });
      return;
    }

    const storedUrl = result.data.url;
    onChange(storedUrl);

    const refreshed = await getSettingsRequest(accessToken);
    if (refreshed.ok) {
      applyBranding(refreshed.data.branding);
    }

    toast.success("Image uploaded and saved");
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {previewSrc ? (
          <div className="inline-flex shrink-0 rounded-lg border bg-white p-2 dark:ring-1 dark:ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading || !accessToken}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={brandingImageAccept()}
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Path returned after upload, e.g. /storage/branding/logo.png"
            disabled={disabled || uploading}
            readOnly={uploading}
          />
          <p className="text-xs text-muted-foreground">
            {hint ??
              "Upload sends the file to POST /api/settings/image (same settings API). Path is read from the response or GET /api/settings."}
          </p>
        </div>
      </div>
    </div>
  );
}
