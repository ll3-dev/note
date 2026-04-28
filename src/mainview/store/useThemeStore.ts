import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ThemeAppearance,
  ThemePalette
} from "@/mainview/features/theme/theme";

type ThemeState = {
  appearance: ThemeAppearance;
  palette: ThemePalette;
  setAppearance: (appearance: ThemeAppearance) => void;
  setPalette: (palette: ThemePalette) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      appearance: "system",
      palette: "neutral",
      setAppearance: (appearance) => set({ appearance }),
      setPalette: (palette) => set({ palette })
    }),
    {
      name: "note-theme"
    }
  )
);
