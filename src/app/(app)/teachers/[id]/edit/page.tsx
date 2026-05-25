"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { TeacherFormDrawer } from "@/components/teachers/teacher-form-drawer";
import { Button } from "@/components/ui/button";
import { getTeacherRequest } from "@/lib/teachers-api";
import { matchTeacherRouteId } from "@/lib/teacher-routes";
import { useAuthStore } from "@/store/auth-store";
import { useTeacherStore } from "@/store/teacher-store";
import type { Teacher } from "@/types/teacher";

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const routeId = typeof params.id === "string" ? params.id : "";

  const accessToken = useAuthStore((s) => s.accessToken);
  const teachers = useTeacherStore((s) => s.teachers);
  const updateTeacher = useTeacherStore((s) => s.updateTeacher);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchSeq = useRef(0);

  useEffect(() => {
    if (!routeId) {
      setLoading(false);
      setTeacher(null);
      return;
    }

    const fromStore =
      teachers.find((t) => matchTeacherRouteId(t, routeId)) ?? null;
    if (fromStore) setTeacher(fromStore);

    if (!accessToken) {
      setLoading(false);
      if (!fromStore) setTeacher(null);
      return;
    }

    const seq = ++fetchSeq.current;
    setLoading(true);
    void (async () => {
      const result = await getTeacherRequest(accessToken, routeId);
      if (seq !== fetchSeq.current) return;
      setLoading(false);
      if (!result.ok) {
        if (!fromStore) setTeacher(null);
        toast.error("Could not load teacher", { description: result.message });
        return;
      }
      setTeacher(result.teacher);
    })();
  }, [routeId, accessToken, teachers]);

  if (!routeId) {
    return (
      <div className="pb-8">
        <p className="text-sm text-muted-foreground">Invalid teacher link.</p>
        <Button variant="link" className="mt-2 px-0" asChild>
          <Link href="/teachers">Back to teachers</Link>
        </Button>
      </div>
    );
  }

  if (!loading && !teacher) {
    return (
      <div className="pb-8">
        <p className="text-sm text-muted-foreground">Teacher not found.</p>
        <Button variant="link" className="mt-2 px-0" asChild>
          <Link href="/teachers">Back to teachers</Link>
        </Button>
      </div>
    );
  }

  if (loading && !teacher) {
    return (
      <div className="pb-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-6 gap-2" asChild>
          <Link href="/teachers">
            <ArrowLeft className="h-4 w-4" />
            Back to teachers
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading teacher…
        </div>
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <div className="pb-8">
      <Button variant="ghost" size="sm" className="-ml-2 mb-6 gap-2" asChild>
        <Link href="/teachers">
          <ArrowLeft className="h-4 w-4" />
          Back to teachers
        </Link>
      </Button>

      <TeacherFormDrawer
        key={teacher.id}
        layout="page"
        open
        mode="edit"
        teacher={teacher}
        teachers={teachers}
        onOpenChange={(open) => {
          if (!open) router.push("/teachers");
        }}
        onSave={(saved) => {
          updateTeacher(saved.id, saved);
          router.push(`/teachers/${encodeURIComponent(saved.id)}`);
        }}
      />
    </div>
  );
}
