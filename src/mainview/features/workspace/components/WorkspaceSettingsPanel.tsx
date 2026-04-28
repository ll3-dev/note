import { Database, Monitor, Moon, Palette, Save, Sun, X } from "lucide-react";
import { Button } from "@/mainview/components/ui/button";
import {
  themeAppearanceLabels,
  themeAppearances,
  themePaletteLabels,
  themePaletteSwatches,
  themePalettes
} from "@/mainview/features/theme/theme";
import { cn } from "@/mainview/lib/utils";
import { useThemeStore } from "@/mainview/store/useThemeStore";
import type { TextSyncStatus } from "../hooks/useBlockTextSync";
import { SaveStatusIndicator } from "./SaveStatusIndicator";

type WorkspaceSettingsPanelProps = {
  blocksCount: number;
  onClose: () => void;
  pagesCount: number;
  saveStatus: TextSyncStatus;
  sqliteVersion?: string;
};

export function WorkspaceSettingsPanel({
  blocksCount,
  onClose,
  pagesCount,
  saveStatus,
  sqliteVersion
}: WorkspaceSettingsPanelProps) {
  const appearance = useThemeStore((state) => state.appearance);
  const palette = useThemeStore((state) => state.palette);
  const setAppearance = useThemeStore((state) => state.setAppearance);
  const setPalette = useThemeStore((state) => state.setPalette);

  return (
    <section className="absolute inset-x-2 bottom-2 z-20 rounded-md border border-border bg-background p-3 text-sm shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">설정</h2>
        <Button
          aria-label="설정 닫기"
          onClick={onClose}
          size="icon-xs"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
      </header>

      <div className="grid gap-3 text-xs text-muted-foreground">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-foreground">
            <Sun className="size-3.5" />
            <span>테마</span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/30 p-1">
            {themeAppearances.map((item) => {
              const Icon = themeAppearanceIcons[item];
              const isActive = item === appearance;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium text-muted-foreground transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-xs"
                      : "hover:bg-background/70 hover:text-foreground"
                  )}
                  key={item}
                  onClick={() => setAppearance(item)}
                  type="button"
                >
                  <Icon className="size-3" />
                  <span>{themeAppearanceLabels[item]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-foreground">
            <Palette className="size-3.5" />
            <span>팔레트</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {themePalettes.map((item) => {
              const swatch = themePaletteSwatches[item];
              const isActive = item === palette;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-md border px-2 text-left text-xs font-medium transition-colors",
                    isActive
                      ? "border-ring bg-background text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  key={item}
                  onClick={() => setPalette(item)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 overflow-hidden rounded-full border border-border"
                  >
                    <span
                      className="h-full w-1/2"
                      style={{ backgroundColor: swatch.surface }}
                    />
                    <span
                      className="h-full w-1/2"
                      style={{ backgroundColor: swatch.accent }}
                    />
                  </span>
                  <span className="truncate">{themePaletteLabels[item]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-foreground">
            <Save className="size-3.5" />
            <span>저장</span>
          </div>
          <SaveStatusIndicator showIdle status={saveStatus} />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2 text-foreground">
            <Database className="size-3.5" />
            <span>데이터베이스</span>
          </div>
          <div className="grid gap-1">
            <div className="flex justify-between">
              <span>SQLite</span>
              <span>{sqliteVersion ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Pages</span>
              <span>{pagesCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Blocks</span>
              <span>{blocksCount}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const themeAppearanceIcons = {
  system: Monitor,
  light: Sun,
  dark: Moon
};
