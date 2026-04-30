import { FileText } from "lucide-react";

type TabDragPreview = {
  id: string;
  title: string;
  x: number;
  y: number;
};

export function TabDragGhost({ preview }: { preview: TabDragPreview }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 flex h-7 max-w-[190px] items-center gap-1 rounded-md border border-border bg-background/95 px-2 text-xs font-medium text-foreground shadow-sm"
      style={{
        left: preview.x,
        top: preview.y,
        transform: "translate(8px, -50%)"
      }}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{preview.title}</span>
    </div>
  );
}
