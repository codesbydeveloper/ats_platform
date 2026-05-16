import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { signInRequest, logoutRequest } from "@/lib/auth-api";
import type { AuthUser } from "@/types/auth";

export type { AuthUser } from "@/types/auth";

export type LoginOutcome =
  | { ok: true }
  | { ok: false; message: string };

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  remember: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (
    email: string,
    password: string,
    remember: boolean
  ) => Promise<LoginOutcome>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      remember: true,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      login: async (email, password, remember) => {
        const trimmed = email.trim();
        if (!trimmed || password.length < 6) {
          return {
            ok: false,
            message: "Enter a valid email and password (6+ characters).",
          };
        }
        const result = await signInRequest(trimmed, password);
        if (!result.ok) {
          return { ok: false, message: result.message };
        }
        set({
          user: result.user,
          accessToken: result.accessToken,
          remember,
        });
        return { ok: true };
      },
      logout: async () => {
        const token = get().accessToken;
        if (token) {
          await logoutRequest(token);
        }
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: "ats-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        remember: state.remember,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
