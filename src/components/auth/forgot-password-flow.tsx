"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordRequest,
  resetPasswordRequest,
} from "@/lib/auth-api";

const forgotEmailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    otp: z.string().min(4, "Enter the code from your email"),
    newPassword: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ForgotEmailValues = z.infer<typeof forgotEmailSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

type ForgotPasswordFlowProps = {
  initialEmail?: string;
  onBackToLogin: () => void;
  onResetSuccess: (email: string) => void;
};

export function ForgotPasswordFlow({
  initialEmail = "",
  onBackToLogin,
  onResetSuccess,
}: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resetting, setResetting] = useState(false);

  const emailForm = useForm<ForgotEmailValues>({
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: initialEmail },
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSendCode = async (values: ForgotEmailValues) => {
    setSendingCode(true);
    try {
      const result = await forgotPasswordRequest(values.email);
      if (!result.ok) {
        toast.error("Could not send code", { description: result.message });
        return;
      }
      resetForm.setValue("email", values.email.trim());
      setStep("reset");
      toast.success("Check your email", { description: result.data.message });
    } finally {
      setSendingCode(false);
    }
  };

  const onResetPassword = async (values: ResetPasswordValues) => {
    setResetting(true);
    try {
      const result = await resetPasswordRequest({
        email: values.email,
        otp: values.otp,
        newPassword: values.newPassword,
      });
      if (!result.ok) {
        toast.error("Could not reset password", { description: result.message });
        return;
      }
      toast.success("Password updated", { description: result.data.message });
      onResetSuccess(values.email.trim());
    } finally {
      setResetting(false);
    }
  };

  if (step === "email") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Forgot password
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a one-time code to reset your
            password.
          </p>
        </div>

        <Form {...emailForm}>
          <form
            className="space-y-4"
            onSubmit={emailForm.handleSubmit(onSendCode)}
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@school.edu"
                      className="bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="h-10 w-full"
              disabled={sendingCode}
            >
              {sendingCode ? "Sending…" : "Send reset code"}
            </Button>
          </form>
        </Form>

        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Reset password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code from your email and choose a new password.
        </p>
      </div>

      <Form {...resetForm}>
        <form
          className="space-y-4"
          onSubmit={resetForm.handleSubmit(onResetPassword)}
        >
          <FormField
            control={resetForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    className="bg-background"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={resetForm.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification code</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="bg-background font-mono tracking-widest"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={resetForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="bg-background pr-11"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={resetForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="bg-background pr-11"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    aria-label={
                      showConfirm ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="h-10 w-full" disabled={resetting}>
            {resetting ? "Updating…" : "Reset password"}
          </Button>
        </form>
      </Form>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            emailForm.setValue("email", resetForm.getValues("email"));
            setStep("email");
          }}
          className="text-sm text-primary hover:underline"
        >
          Resend code
        </button>
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </button>
      </div>
    </div>
  );
}
