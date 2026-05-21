"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

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
import { changePasswordRequest } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth-store";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggleShow,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="pr-11"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const MIN_NEW_PASSWORD = 6;

export function ChangePasswordCard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const newTooShort =
    newPassword.length > 0 && newPassword.length < MIN_NEW_PASSWORD;
  const confirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsCurrent =
    newPassword.length > 0 &&
    currentPassword.length > 0 &&
    newPassword === currentPassword;

  const canSubmit =
    Boolean(accessToken) &&
    currentPassword.length > 0 &&
    newPassword.length >= MIN_NEW_PASSWORD &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    !submitting;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!accessToken) {
      toast.error("Sign in required", {
        description: "Sign in again to change your password.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePasswordRequest(
        accessToken,
        currentPassword,
        newPassword
      );
      if (!result.ok) {
        toast.error("Could not update password", {
          description: result.message,
        });
        return;
      }
      resetForm();
      toast.success("Password updated", {
        description: result.data.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Change password
        </CardTitle>
        <CardDescription>
          Enter your current password, then choose a new one (min 6 characters).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="current-password"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            show={showPasswords}
            onToggleShow={() => setShowPasswords((v) => !v)}
            disabled={submitting}
          />
          <PasswordField
            id="new-password"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            show={showPasswords}
            onToggleShow={() => setShowPasswords((v) => !v)}
            disabled={submitting}
            hint={`At least ${MIN_NEW_PASSWORD} characters.`}
          />
          {newTooShort ? (
            <p className="text-sm text-destructive">
              New password must be at least {MIN_NEW_PASSWORD} characters.
            </p>
          ) : null}
          {sameAsCurrent ? (
            <p className="text-sm text-destructive">
              New password must be different from your current password.
            </p>
          ) : null}
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            show={showPasswords}
            onToggleShow={() => setShowPasswords((v) => !v)}
            disabled={submitting}
          />
          {confirmMismatch ? (
            <p className="text-sm text-destructive">
              Confirmation does not match the new password.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                submitting ||
                (!currentPassword && !newPassword && !confirmPassword)
              }
              onClick={resetForm}
            >
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
