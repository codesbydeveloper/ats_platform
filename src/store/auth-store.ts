import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AuthUser {
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  remember: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, password: string, remember: boolean) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      remember: true,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      login: (email, password, remember) => {
        const trimmed = email.trim();
        if (!trimmed || password.length < 6) {
          return false;
        }
        const local = trimmed.split("@")[0] ?? "user";
        const name =
          local
            .split(/[._-]/)
            .filter(Boolean)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(" ") || "User";
        set({ user: { email: trimmed, name }, remember });
        return true;
      },
      logout: () => set({ user: null }),
    }),
    {
      name: "ats-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        remember: state.remember,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
