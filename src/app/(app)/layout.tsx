import { AuthGuard } from "@/components/layout/auth-guard";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
