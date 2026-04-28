export const themeAppearances = ["system", "light", "dark"] as const;

export type ThemeAppearance = (typeof themeAppearances)[number];

export const themePalettes = ["neutral", "sage", "blue", "rose"] as const;

export type ThemePalette = (typeof themePalettes)[number];

export type ResolvedTheme = "light" | "dark";

export const themeAppearanceLabels: Record<ThemeAppearance, string> = {
  system: "시스템",
  light: "라이트",
  dark: "다크"
};

export const themePaletteLabels: Record<ThemePalette, string> = {
  neutral: "Neutral",
  sage: "Sage",
  blue: "Blue",
  rose: "Rose"
};

export const themePaletteSwatches: Record<
  ThemePalette,
  { accent: string; surface: string }
> = {
  neutral: {
    accent: "oklch(0.22 0 0)",
    surface: "oklch(0.972 0 0)"
  },
  sage: {
    accent: "oklch(0.43 0.08 155)",
    surface: "oklch(0.965 0.018 155)"
  },
  blue: {
    accent: "oklch(0.48 0.12 245)",
    surface: "oklch(0.966 0.018 245)"
  },
  rose: {
    accent: "oklch(0.51 0.12 20)",
    surface: "oklch(0.966 0.018 20)"
  }
};

export function resolveThemeAppearance(
  appearance: ThemeAppearance,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (appearance === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return appearance;
}
