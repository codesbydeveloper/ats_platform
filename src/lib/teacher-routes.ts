import type { Teacher } from "@/types/teacher";

export function teacherProfilePath(teacher: Pick<Teacher, "id">): string {
  return `/teachers/${encodeURIComponent(teacher.id)}`;
}

export function teacherEditPath(teacher: Pick<Teacher, "id">): string {
  return `/teachers/${encodeURIComponent(teacher.id)}/edit`;
}

export function matchTeacherRouteId(
  teacher: Teacher,
  routeId: string
): boolean {
  const id = routeId.trim();
  if (!id) return false;
  return teacher.id === id || teacher.teacherCode === id;
}
