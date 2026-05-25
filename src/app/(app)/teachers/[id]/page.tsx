"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { TeacherProfileView } from "@/components/teachers/teacher-profile-view";
import { Button } from "@/components/ui/button";
import { matchTeacherRouteId, teacherEditPath } from "@/lib/teacher-routes";
import {
  downloadTeacherResumeRequest,
  getTeacherRequest,
} from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth-store";
import { useTeacherStore } from "@/store/teacher-store";
import type { Teacher } from "@/types/teacher";

export default function TeacherProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const accessToken = useAuthStore((s) => s.accessToken);
  const teachers = useTeacherStore((s) => s.teachers);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeDownloading, setResumeDownloading] = useState(false);
  const fetchSeq = useRef(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fromStore =
      teachers.find((t) => matchTeacherRouteId(t, id)) ?? null;
    if (fromStore) setTeacher(fromStore);

    if (!accessToken) {
      setLoading(false);
      if (!fromStore) setTeacher(null);
      return;
    }

    const seq = ++fetchSeq.current;
    setLoading(true);
    void (async () => {
      const result = await getTeacherRequest(accessToken, id);
      if (seq !== fetchSeq.current) return;
      setLoading(false);
      if (!result.ok) {
        if (!fromStore) setTeacher(null);
        toast.error("Could not load teacher", { description: result.message });
        return;
      }
      setTeacher(result.teacher);
    })();
  }, [id, accessToken, teachers]);

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Invalid teacher link.</p>
        <Button variant="link" className="mt-2 px-0" asChild>
          <Link href="/teachers">Back to teachers</Link>
        </Button>
      </div>
    );
  }

  if (!loading && !teacher) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Teacher not found.</p>
        <Button variant="link" className="mt-2 px-0" asChild>
          <Link href="/teachers">Back to teachers</Link>
        </Button>
      </div>
    );
  }

  const showLoading = loading && !teacher;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href="/teachers">
            <ArrowLeft className="h-4 w-4" />
            Back to teachers
          </Link>
        </Button>
      </div>

      <PageHeader
        title={teacher?.name ?? "Teacher profile"}
        description="Full read-only profile with all saved fields."
      >
        {teacher ? (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={teacherEditPath(teacher)}>Edit teacher</Link>
          </Button>
        ) : null}
      </PageHeader>

      {showLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading profile…
        </div>
      ) : teacher ? (
        <TeacherProfileView
          teacher={teacher}
          loading={loading && Boolean(accessToken)}
          resumeDownloading={resumeDownloading}
          onDownloadResume={
            accessToken && teacher.resumeFileName
              ? () => {
                  void (async () => {
                    setResumeDownloading(true);
                    const result = await downloadTeacherResumeRequest(
                      accessToken,
                      teacher.id,
                      teacher.resumeFileName
                    );
                    setResumeDownloading(false);
                    if (!result.ok) {
                      toast.error("Download failed", {
                        description: result.message,
                      });
                      return;
                    }
                    toast.success("Resume downloaded", {
                      description: result.filename,
                    });
                  })();
                }
              : undefined
          }
        />
      ) : null}

    </div>
  );
}
