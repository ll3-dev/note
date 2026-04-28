import { Copy, Trash2, X } from "lucide-react";
import { Button } from "@/mainview/components/ui/button";

type BlockSelectionToolbarProps = {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function BlockSelectionToolbar({
  count,
  onClear,
  onDelete,
  onDuplicate
}: BlockSelectionToolbarProps) {
  if (count < 1) {
    return null;
  }

  return (
    <div
      className="sticky top-0 z-10 mb-2 flex items-center gap-1 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="mr-2 min-w-0 text-muted-foreground">
        {count === 1 ? "1 block selected" : `${count} blocks selected`}
      </span>
      <Button className="h-7 px-2" onClick={onDuplicate} size="sm" variant="ghost">
        <Copy className="mr-1 size-3.5" />
        Duplicate
      </Button>
      <Button className="h-7 px-2" onClick={onDelete} size="sm" variant="ghost">
        <Trash2 className="mr-1 size-3.5" />
        Delete
      </Button>
      <Button
        aria-label="선택 해제"
        className="ml-auto size-7"
        onClick={onClear}
        size="icon"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
