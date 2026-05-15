import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { EXPERIENCE_BUCKETS } from "@/data/constants";

export interface TeacherFilters {
  subjects: string[];
  roles: string[];
  grades: string[];
  boards: string[];
  cities: string[];
  states: string[];
  /** Experience bucket labels matching EXPERIENCE_BUCKETS */
  experience: string[];
  status: string[];
  skills: string[];
  search: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: TeacherFilters;
}

const emptyFilters = (): TeacherFilters => ({
  subjects: [],
  roles: [],
  grades: [],
  boards: [],
  cities: [],
  states: [],
  experience: [],
  status: [],
  skills: [],
  search: "",
});

interface FilterState {
  filters: TeacherFilters;
  presets: FilterPreset[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setFilters: (patch: Partial<TeacherFilters>) => void;
  replaceFilters: (filters: TeacherFilters) => void;
  resetFilters: () => void;
  addPreset: (name: string, filtersOverride?: TeacherFilters) => void;
  removePreset: (id: string) => void;
}

export function matchesExperienceBucket(
  years: number,
  bucketLabel: string
): boolean {
  const bucket = EXPERIENCE_BUCKETS.find((b) => b.label === bucketLabel);
  if (!bucket) return true;
  return years >= bucket.min && years <= bucket.max;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      filters: emptyFilters(),
      presets: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setFilters: (patch) =>
        set({ filters: { ...get().filters, ...patch } }),
      replaceFilters: (filters) => set({ filters }),
      resetFilters: () => set({ filters: emptyFilters() }),
      addPreset: (name, filtersOverride) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const snapshot = filtersOverride ?? get().filters;
        const id = `preset-${Date.now()}`;
        set({
          presets: [
            ...get().presets,
            { id, name: trimmed, filters: { ...snapshot } },
          ],
        });
      },
      removePreset: (id) =>
        set({ presets: get().presets.filter((p) => p.id !== id) }),
    }),
    {
      name: "ats-filters",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        presets: state.presets,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export { emptyFilters };
