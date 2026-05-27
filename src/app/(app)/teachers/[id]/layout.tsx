/** Ensure view/edit URLs work on direct load and refresh on Vercel (not static-only). */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default function TeacherIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
