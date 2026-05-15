import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { generateMockTeachers } from "@/data/mock-teachers";
import type { Teacher } from "@/types/teacher";

interface TeacherState {
  teachers: Teacher[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setTeachers: (teachers: Teacher[]) => void;
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (id: string, patch: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
  importTeachers: (incoming: Teacher[]) => void;
}

const seedTeachers = generateMockTeachers(55);

export const useTeacherStore = create<TeacherState>()(
  persist(
    (set, get) => ({
      teachers: seedTeachers,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setTeachers: (teachers) => set({ teachers }),
      addTeacher: (teacher) =>
        set({ teachers: [teacher, ...get().teachers] }),
      updateTeacher: (id, patch) =>
        set({
          teachers: get().teachers.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        }),
      deleteTeacher: (id) =>
        set({ teachers: get().teachers.filter((t) => t.id !== id) }),
      bulkDelete: (ids) =>
        set({
          teachers: get().teachers.filter((t) => !ids.includes(t.id)),
        }),
      importTeachers: (incoming) =>
        set({ teachers: [...incoming, ...get().teachers] }),
    }),
    {
      name: "ats-teachers",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ teachers: state.teachers }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
