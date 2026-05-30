"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";

import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";
import { BrandLogo } from "@/components/layout/brand-logo";
import { toast } from "sonner";
import { useBrandingStore } from "@/store/branding-store";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const rememberDefault = useAuthStore((s) => s.remember);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authView, setAuthView] = useState<"login" | "forgot">("login");

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const branding = useBrandingStore((s) => s.branding);
  const refreshForLogin = useBrandingStore((s) => s.refreshForLogin);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [router, user]);

  useEffect(() => {
    void refreshForLogin();
  }, [refreshForLogin]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: rememberDefault,
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true);
    try {
      const result = await login(
        values.email,
        values.password,
        values.remember
      );
      if (!result.ok) {
        toast.error("Sign in failed", { description: result.message });
        return;
      }
      toast.success("Welcome back");
      router.replace("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-8 sm:px-6 sm:py-12">
      <div className="app-card w-full max-w-[880px] overflow-hidden">
        <div className="h-1 bg-primary" aria-hidden />

        <div className="grid md:grid-cols-2">
          <section className="flex flex-col justify-between gap-8 border-b border-border bg-secondary/40 p-8 sm:p-10 md:border-b-0 md:border-r">
            <BrandLogo
              variant="login-form"
              wrapClassName="justify-start"
              logoSrc={branding.loginLogoUrl}
              alt={branding.siteName}
            />

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                {branding.loginHeading}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {branding.loginDescription}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              © {branding.copyrightYear} {branding.copyrightName}
            </p>
          </section>

          <section className="flex flex-col justify-center p-8 sm:p-10">
            {authView === "login" ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Sign in
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Admin email and password
                  </p>
                </div>

                <Form {...form}>
                  <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit(onSubmit)}
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
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
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <button
                              type="button"
                              onClick={() => setAuthView("forgot")}
                              className="text-xs text-primary hover:underline"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="bg-background pr-11"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                              aria-label={
                                showPassword
                                  ? "Hide password"
                                  : "Show password"
                              }
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
                      control={form.control}
                      name="remember"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Remember me
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="mt-1 h-10 w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <ForgotPasswordFlow
                initialEmail={form.getValues("email")}
                onBackToLogin={() => setAuthView("login")}
                onResetSuccess={(email) => {
                  form.setValue("email", email);
                  form.setValue("password", "");
                  setAuthView("login");
                }}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
