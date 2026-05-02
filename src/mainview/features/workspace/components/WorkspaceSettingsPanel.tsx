import {
  Archive,
  ClipboardCopy,
  Database,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Sun,
  X
} from "lucide-react";
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
import type { TextSyncStatus } from "@/mainview/features/workspace/hooks/useBlockTextSync";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import type { Page } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";

type WorkspaceSettingsPanelProps = {
  archivedPages: Page[];
  blocksCount: number;
  onClose: () => void;
  onCopyCurrentPageMarkdown: () => void;
  onRestoreArchivedPage: (page: Page) => void;
  pagesCount: number;
  saveStatus: TextSyncStatus;
  sqliteVersion?: string;
};

export function WorkspaceSettingsPanel({
  archivedPages,
  blocksCount,
  onClose,
  onCopyCurrentPageMarkdown,
  onRestoreArchivedPage,
  pagesCount,
  saveStatus,
  sqliteVersion
}: WorkspaceSettingsPanelProps) {
  const appearance = useThemeStore((state) => state.appearance);
  const palette = useThemeStore((state) => state.palette);
  const setAppearance = useThemeStore((state) => state.setAppearance);
  const setPalette = useThemeStore((state) => state.setPalette);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/55 px-4 backdrop-blur-sm">
      <section
        aria-label="설정"
        aria-modal="true"
        className="grid max-h-[min(760px,calc(100vh-64px))] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-background text-sm shadow-xl"
        role="dialog"
      >
      <header className="flex h-12 items-center justify-between border-b border-border px-4">
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

      <div className="min-h-0 overflow-y-auto p-4">
        <div className="grid gap-4 text-xs text-muted-foreground md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-4">
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
          </div>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2 text-foreground">
                <Archive className="size-3.5" />
                <span>복구</span>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                {archivedPages.length > 0 ? (
                  <div className="grid gap-px p-1">
                    {archivedPages.map((page) => (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/40"
                        key={page.id}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {getPageTitleDisplay(page.title)}
                          </div>
                          <div className="truncate text-[11px]">
                            {page.archivedAt ?? "-"}
                          </div>
                        </div>
                        <Button
                          aria-label={`${getPageTitleDisplay(page.title)} 페이지 복구`}
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => onRestoreArchivedPage(page)}
                          size="xs"
                          type="button"
                          variant="outline"
                        >
                          <RotateCcw className="size-3" />
                          복구
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-center text-xs">
                    복구할 페이지가 없습니다.
                  </div>
                )}
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
                <ClipboardCopy className="size-3.5" />
                <span>Markdown</span>
              </div>
              <Button
                className="h-8 justify-start px-2 text-xs"
                onClick={onCopyCurrentPageMarkdown}
                size="sm"
                type="button"
                variant="outline"
              >
                현재 페이지 Markdown 복사
              </Button>
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
                  <span>Archived</span>
                  <span>{archivedPages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blocks</span>
                  <span>{blocksCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>
    </div>
  );
}

const themeAppearanceIcons = {
  system: Monitor,
  light: Sun,
  dark: Moon
};
