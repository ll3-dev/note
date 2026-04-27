import { Database, Save, X } from "lucide-react";
import { Button } from "@/mainview/components/ui/button";
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
