"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TeacherFormDrawer } from "@/components/teachers/teacher-form-drawer";
import { Button } from "@/components/ui/button";
import { useTeacherStore } from "@/store/teacher-store";

export default function NewTeacherPage() {
  const router = useRouter();
  const teachers = useTeacherStore((s) => s.teachers);
  const addTeacher = useTeacherStore((s) => s.addTeacher);

  return (
    <div className="pb-8">
      <Button variant="ghost" size="sm" className="-ml-2 mb-6 gap-2" asChild>
        <Link href="/teachers">
          <ArrowLeft className="h-4 w-4" />
          Back to teachers
        </Link>
      </Button>

      <TeacherFormDrawer
        layout="page"
        open
        mode="add"
        teachers={teachers}
        onOpenChange={(open) => {
          if (!open) router.push("/teachers");
        }}
        onSave={(teacher) => {
          addTeacher(teacher);
          router.push("/teachers");
        }}
      />
    </div>
  );
}
