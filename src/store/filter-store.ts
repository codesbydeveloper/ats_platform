import { cloneTeacherFilters } from "@/lib/teacher-list-search-params";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Values keyed by API field `key` from GET /api/categories/all (filter=1). */
export type DynamicTeacherFilters = Record<string, string[]>;

export interface TeacherFilters {
  search: string;
  dynamic: DynamicTeacherFilters;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: TeacherFilters;
}

const emptyFilters = (): TeacherFilters => ({
  search: "",
  dynamic: {},
});

function migratePersistedFilters(stored: unknown): TeacherFilters {
  if (!stored || typeof stored !== "object") return emptyFilters();
  const s = stored as Record<string, unknown>;

  if (s.dynamic && typeof s.dynamic === "object" && !Array.isArray(s.dynamic)) {
    const dynamic: DynamicTeacherFilters = {};
    for (const [k, v] of Object.entries(s.dynamic as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        dynamic[k] = v.map(String).filter((x) => x.trim().length > 0);
      }
    }
    return {
      search: typeof s.search === "string" ? s.search : "",
      dynamic,
    };
  }

  const dynamic: DynamicTeacherFilters = {};
  const legacyKeys = [
    "subjects",
    "roles",
    "grades",
    "boards",
    "cities",
    "states",
    "status",
    "skills",
    "experience",
  ] as const;

  const legacyMap: Record<string, string> = {
    subjects: "subject",
    roles: "role",
    grades: "grade",
    boards: "board",
    cities: "city",
    states: "state",
    status: "status",
    skills: "skills",
    experience: "experience",
  };

  for (const legacy of legacyKeys) {
    const arr = s[legacy];
    if (Array.isArray(arr) && arr.length > 0) {
      const key = legacyMap[legacy] ?? legacy;
      dynamic[key] = arr.map(String);
    }
  }

  return {
    search: typeof s.search === "string" ? s.search : "",
    dynamic,
  };
}

interface FilterState {
  /** Draft values in the advanced search panel (edited before Search). */
  filters: TeacherFilters;
  /** Last-applied values sent to GET /api/teachers (updated on Search / Reset). */
  appliedFilters: TeacherFilters;
  presets: FilterPreset[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setFilters: (patch: Partial<TeacherFilters>) => void;
  replaceFilters: (filters: TeacherFilters) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  setDynamicFilter: (key: string, values: string[]) => void;
  addPreset: (name: string, filtersOverride?: TeacherFilters) => void;
  removePreset: (id: string) => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      filters: emptyFilters(),
      appliedFilters: emptyFilters(),
      presets: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setFilters: (patch) =>
        set({
          filters: {
            ...get().filters,
            ...patch,
            dynamic: patch.dynamic ?? get().filters.dynamic,
          },
        }),
      replaceFilters: (filters) => {
        const next = cloneTeacherFilters(filters);
        set({ filters: next, appliedFilters: next });
      },
      resetFilters: () => {
        const empty = emptyFilters();
        set({ filters: empty, appliedFilters: empty });
      },
      applyFilters: () => {
        set({ appliedFilters: cloneTeacherFilters(get().filters) });
      },
      setDynamicFilter: (key, values) =>
        set({
          filters: {
            ...get().filters,
            dynamic: { ...get().filters.dynamic, [key]: values },
          },
        }),
      addPreset: (name, filtersOverride) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const snapshot = filtersOverride ?? get().filters;
        const id = `preset-${Date.now()}`;
        set({
          presets: [
            ...get().presets,
            { id, name: trimmed, filters: { ...snapshot, dynamic: { ...snapshot.dynamic } } },
          ],
        });
      },
      removePreset: (id) =>
        set({ presets: get().presets.filter((p) => p.id !== id) }),
    }),
    {
      name: "ats-filters-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        presets: state.presets,
      }),
      migrate: (persisted) => {
        const draft = migratePersistedFilters(
          (persisted as { filters?: unknown })?.filters ?? persisted
        );
        return {
        filters: draft,
        appliedFilters: emptyFilters(),
        presets:
          persisted && typeof persisted === "object" && "presets" in persisted
            ? (persisted as { presets: FilterPreset[] }).presets
            : [],
        hasHydrated: false,
      };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export { emptyFilters };
