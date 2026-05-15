import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  themePreference: ThemePreference;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  compactDensity: boolean;
  showTableBanners: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (value: boolean) => void;
  setThemePreference: (value: ThemePreference) => void;
  setEmailNotifications: (value: boolean) => void;
  setPushNotifications: (value: boolean) => void;
  setWeeklyDigest: (value: boolean) => void;
  setCompactDensity: (value: boolean) => void;
  setShowTableBanners: (value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      themePreference: "system",
      emailNotifications: true,
      pushNotifications: true,
      weeklyDigest: false,
      compactDensity: false,
      showTableBanners: true,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      toggleSidebar: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
      setThemePreference: (value) => set({ themePreference: value }),
      setEmailNotifications: (value) => set({ emailNotifications: value }),
      setPushNotifications: (value) => set({ pushNotifications: value }),
      setWeeklyDigest: (value) => set({ weeklyDigest: value }),
      setCompactDensity: (value) => set({ compactDensity: value }),
      setShowTableBanners: (value) => set({ showTableBanners: value }),
    }),
    {
      name: "ats-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        themePreference: state.themePreference,
        emailNotifications: state.emailNotifications,
        pushNotifications: state.pushNotifications,
        weeklyDigest: state.weeklyDigest,
        compactDensity: state.compactDensity,
        showTableBanners: state.showTableBanners,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
