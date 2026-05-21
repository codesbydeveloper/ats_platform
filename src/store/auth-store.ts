import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getMeRequest, signInRequest, logoutRequest } from "@/lib/auth-api";
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
  /** Sync user from GET /api/auth/me */
  refreshSession: () => Promise<LoginOutcome>;
  setUser: (user: AuthUser) => void;
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
        if (result.accessToken) {
          const me = await getMeRequest(result.accessToken);
          if (me.ok) {
            set({ user: me.data.user });
          }
        }
        return { ok: true };
      },
      refreshSession: async () => {
        const token = get().accessToken;
        if (!token) {
          return { ok: false, message: "Not signed in." };
        }
        const me = await getMeRequest(token);
        if (!me.ok) {
          set({ user: null, accessToken: null });
          return { ok: false, message: me.message };
        }
        set({ user: me.data.user });
        return { ok: true };
      },
      setUser: (user) => set({ user }),
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
