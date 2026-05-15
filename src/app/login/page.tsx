"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

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

const features = [
  "Pipeline-grade roster intelligence",
  "Imports with validation & duplicate checks",
  "Premium analytics tuned for hiring teams",
];

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const rememberDefault = useAuthStore((s) => s.remember);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [router, user]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: rememberDefault,
    },
  });

  const onSubmit = (values: LoginValues) => {
    const ok = login(values.email, values.password, values.remember);
    if (!ok) {
      toast.error("Check your credentials", {
        description: "Use any email and a password with 6+ characters.",
      });
      return;
    }
    toast.success("Welcome back");
    router.replace("/dashboard");
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-4 w-4" />
              ATS Teachers
            </div>
            <h1 className="mt-8 max-w-md text-4xl font-semibold leading-tight tracking-tight">
              The calmest way to run teacher hiring.
            </h1>
            <p className="mt-4 max-w-md text-base text-white/80">
              A focused workspace for recruiters who care about craft — fast
              rostering, crisp analytics, and zero clutter.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/90">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {f}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <p className="text-sm text-white/80">
              Demo mode: no backend. Your session stays in this browser via
              localStorage.
            </p>
          </div>
        </div>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-white/20 blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>
      <div className="flex items-center justify-center bg-muted/40 p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl border bg-background/80 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl"
        >
          <div className="mb-8 space-y-1 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Secure access
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Sign in to continue
            </h2>
            <p className="text-sm text-muted-foreground">
              Use any email and a password with at least six characters.
            </p>
          </div>
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
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
                    <FormLabel className="!mt-0 font-normal">Remember me</FormLabel>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to the demo terms for this local-only build.
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground lg:hidden">
            Prefer the full experience?{" "}
            <span className="font-medium text-foreground">Open on desktop.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
