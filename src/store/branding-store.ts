import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  applySiteBrandingToDocument,
  DEFAULT_SITE_BRANDING,
  mergeSiteBranding,
  type SiteBranding,
} from "@/lib/site-branding";
import {
  fetchBrandingSettingsRequest,
  getSettingsRequest,
} from "@/lib/settings-api";

interface BrandingState {
  branding: SiteBranding;
  setBranding: (patch: Partial<SiteBranding>) => void;
  applyBranding: (branding: SiteBranding) => void;
  /** Authenticated load from GET /api/settings */
  refreshFromApi: (accessToken: string) => Promise<void>;
  /** Login page — try public GET, keep cache on failure */
  refreshForLogin: () => Promise<void>;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set, get) => ({
      branding: { ...DEFAULT_SITE_BRANDING },

      setBranding: (patch) => {
        const next = mergeSiteBranding(get().branding, patch);
        set({ branding: next });
        applySiteBrandingToDocument(next);
      },

      applyBranding: (branding) => {
        set({ branding });
        applySiteBrandingToDocument(branding);
      },

      refreshFromApi: async (accessToken) => {
        const result = await getSettingsRequest(accessToken);
        if (result.ok) {
          get().applyBranding(result.data.branding);
        }
      },

      refreshForLogin: async () => {
        const result = await fetchBrandingSettingsRequest();
        if (result.ok) {
          get().applyBranding(result.data);
        }
      },
    }),
    {
      name: "ats-branding",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ branding: s.branding }),
      onRehydrateStorage: () => (state) => {
        if (state?.branding) {
          applySiteBrandingToDocument(state.branding);
        }
      },
    }
  )
);
