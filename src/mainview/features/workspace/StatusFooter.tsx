import { Database } from "lucide-react";

type StatusFooterProps = {
  blocksCount: number;
  pagesCount: number;
  sqliteVersion?: string;
};

export function StatusFooter({
  blocksCount,
  pagesCount,
  sqliteVersion
}: StatusFooterProps) {
  return (
    <footer className="border-t border-border p-3">
      <div className="grid gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="size-3.5" />
          <span>SQLite {sqliteVersion ?? "-"}</span>
        </div>
        <div className="flex justify-between">
          <span>{pagesCount} pages</span>
          <span>{blocksCount} blocks</span>
        </div>
      </div>
    </footer>
  );
}
