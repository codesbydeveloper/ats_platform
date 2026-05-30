"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
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
import { getSettingsRequest, updateSettingsRequest } from "@/lib/settings-api";
import { useAuthStore } from "@/store/auth-store";

export function OpenAiSettingsCard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [apiKey, setApiKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    setKeyConfigured(result.data.openaiApiKeyConfigured);
    setApiKey(result.data.openaiApiKey || "");
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error("Sign in required");
      return;
    }
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Enter an OpenAI API key");
      return;
    }

    setSaving(true);
    const result = await updateSettingsRequest(accessToken, {
      openaiApiKey: trimmed,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error("Could not save OpenAI settings", {
        description: result.message,
      });
      return;
    }

    setLoadError(null);
    setKeyConfigured(result.data.openaiApiKeyConfigured);
    setApiKey(result.data.openaiApiKey || trimmed);
    toast.success("OpenAI settings saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          OpenAI
        </CardTitle>
        <CardDescription>
          API key used for resume parsing and other AI features on the server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <SettingsLoadNotice message={loadError} />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading saved key…</p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="openai-api-key">API key</Label>
            <div className="relative max-w-xl">
              <Input
                id="openai-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-…"
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
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {keyConfigured && !apiKey && !loadError ? (
              <p className="text-xs text-muted-foreground">
                A key is saved on the server. Paste a new value only if you want
                to change it.
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={fieldsDisabled}>
            {saving ? "Saving…" : "Save OpenAI key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
