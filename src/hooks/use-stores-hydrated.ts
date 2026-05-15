"use client";

import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { useFilterStore } from "@/store/filter-store";
import { useTeacherStore } from "@/store/teacher-store";
import { useUiStore } from "@/store/ui-store";

export function useStoresHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stores = [
      useAuthStore,
      useTeacherStore,
      useFilterStore,
      useUiStore,
    ] as const;

    const sync = () => {
      if (cancelled) return;
      if (stores.every((s) => s.persist.hasHydrated())) {
        stores.forEach((s) => {
          s.getState().setHasHydrated(true);
        });
        setHydrated(true);
      }
    };

    sync();
    const unsubs = stores.map((s) => s.persist.onFinishHydration(sync));
    const id = requestAnimationFrame(sync);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      unsubs.forEach((u) => u());
    };
  }, []);

  return hydrated;
}
