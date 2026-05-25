import type { Teacher } from "@/types/teacher";
import { teacherMatchesDynamicFilter } from "@/lib/category-filter-fields";
import type { TeacherFilters } from "@/store/filter-store";

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
  const dynamicEntries = Object.entries(filters.dynamic).filter(
    ([, values]) => values.length > 0
  );

  return teachers.filter((t) => {
    if (!textMatch(t, filters.search)) return false;

    for (const [key, values] of dynamicEntries) {
      if (!teacherMatchesDynamicFilter(t, key, values)) {
        return false;
      }
    }
    return true;
  });
}
