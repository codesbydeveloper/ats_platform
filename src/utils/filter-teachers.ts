import type { Teacher } from "@/types/teacher";
import type { TeacherFilters } from "@/store/filter-store";
import { matchesExperienceBucket } from "@/store/filter-store";

function includesAny(haystack: string[], needles: string[]) {
  if (!needles.length) return true;
  return needles.some((n) => haystack.includes(n));
}

function textMatch(teacher: Teacher, q: string) {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  return (
    teacher.name.toLowerCase().includes(s) ||
    teacher.email.toLowerCase().includes(s) ||
    teacher.id.toLowerCase().includes(s) ||
    teacher.mobile.includes(s) ||
    teacher.city.toLowerCase().includes(s) ||
    teacher.subject.toLowerCase().includes(s)
  );
}

export function filterTeachers(
  teachers: Teacher[],
  filters: TeacherFilters
): Teacher[] {
  return teachers.filter((t) => {
    if (!textMatch(t, filters.search)) return false;
    if (filters.subjects.length && !filters.subjects.includes(t.subject)) {
      return false;
    }
    if (filters.roles.length && !filters.roles.some((r) => t.roles.includes(r))) {
      return false;
    }
    if (
      filters.grades.length &&
      !filters.grades.some((g) => t.grades.includes(g))
    ) {
      return false;
    }
    if (
      filters.boards.length &&
      !filters.boards.some((b) => t.boards.includes(b))
    ) {
      return false;
    }
    if (filters.cities.length && !filters.cities.includes(t.city)) {
      return false;
    }
    if (filters.states.length && !filters.states.includes(t.state)) {
      return false;
    }
    if (
      filters.status.length &&
      !filters.status.includes(t.status)
    ) {
      return false;
    }
    if (
      filters.skills.length &&
      !includesAny(t.skills, filters.skills)
    ) {
      return false;
    }
    if (filters.experience.length) {
      const ok = filters.experience.some((label) =>
        matchesExperienceBucket(t.experienceYears, label)
      );
      if (!ok) return false;
    }
    return true;
  });
}
