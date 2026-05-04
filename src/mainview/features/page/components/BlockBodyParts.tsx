import { ChevronDown, ChevronRight } from "lucide-react";
import type { Block } from "@/shared/contracts";

export function TodoMarker({
  block,
  checked,
  onCheckedChange
}: {
  block: Block;
  checked: boolean;
  onCheckedChange: (block: Block, checked: boolean) => void;
}) {
  return (
    <input
      aria-label="완료 여부"
      checked={checked}
      className="mt-2.5 size-4 shrink-0 accent-foreground"
      onChange={(event) => onCheckedChange(block, event.target.checked)}
      type="checkbox"
    />
  );
}

export function BulletedListMarker({ depth }: { depth: number }) {
  return (
    <span className="flex h-7 w-3 shrink-0 items-center justify-center">
      <BulletMarker depth={depth} />
    </span>
  );
}

export function NumberedListMarker({
  blockIndex,
  marker
}: {
  blockIndex: number;
  marker: number | null;
}) {
  return (
    <span className="flex h-7 w-5 shrink-0 items-center justify-end text-sm font-medium text-muted-foreground">
      {marker ?? blockIndex + 1}.
    </span>
  );
}

export function ToggleMarker({
  isOpen,
  onToggle
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-label={isOpen ? "토글 닫기" : "토글 열기"}
      className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      onClick={onToggle}
      onMouseDown={(event) => event.preventDefault()}
      type="button"
    >
      {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
    </button>
  );
}

export function CalloutMarker({ icon }: { icon: unknown }) {
  return (
    <span className="mt-1 shrink-0 text-lg" role="img" aria-label="callout icon">
      {typeof icon === "string" ? icon : "💡"}
    </span>
  );
}

export function DividerBlockBody() {
  return (
    <div
      aria-orientation="horizontal"
      className="group/divider flex h-7 w-full items-center px-1 outline-none"
      role="separator"
    >
      <span className="h-px w-full rounded-full bg-border transition-colors group-hover/divider:bg-muted-foreground/45" />
    </div>
  );
}

function BulletMarker({ depth }: { depth: number }) {
  if (depth % 3 === 1) {
    return <span className="size-1.5 rounded-[1px] bg-foreground/70" />;
  }

  if (depth % 3 === 2) {
    return <span className="size-1.5 rounded-full border border-foreground/70" />;
  }

  return <span className="size-1.5 rounded-full bg-foreground/70" />;
}
