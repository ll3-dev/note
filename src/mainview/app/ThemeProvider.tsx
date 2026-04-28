import { useLayoutEffect, useState, type ReactNode } from "react";
import {
  resolveThemeAppearance,
  type ResolvedTheme,
  type ThemeAppearance,
  type ThemePalette
} from "@/mainview/features/theme/theme";
import { useThemeStore } from "@/mainview/store/useThemeStore";

const themeMediaQuery = "(prefers-color-scheme: dark)";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const appearance = useThemeStore((state) => state.appearance);
  const palette = useThemeStore((state) => state.palette);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    getSystemPrefersDark
  );

  useLayoutEffect(() => {
    const mediaQueryList = window.matchMedia(themeMediaQuery);

    setSystemPrefersDark(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  useLayoutEffect(() => {
    applyThemeToRoot(
      document.documentElement,
      appearance,
      palette,
      resolveThemeAppearance(appearance, systemPrefersDark)
    );
  }, [appearance, palette, systemPrefersDark]);

  return children;
}

export function applyThemeToRoot(
  root: HTMLElement,
  appearance: ThemeAppearance,
  palette: ThemePalette,
  resolvedTheme: ResolvedTheme
) {
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.themeAppearance = appearance;
  root.dataset.theme = resolvedTheme;
  root.dataset.palette = palette;
  root.style.colorScheme = resolvedTheme;
}

function getSystemPrefersDark() {
  return window.matchMedia(themeMediaQuery).matches;
}
