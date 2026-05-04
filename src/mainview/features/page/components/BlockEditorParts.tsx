import type { RefObject, ReactNode } from "react";
import { BlockDragHandle } from "./BlockDragHandle";
import { BlockCommandMenu } from "./BlockCommandMenu";
import { InlineFormattingToolbar } from "./InlineFormattingToolbar";
import type { BlockCommand } from "@/mainview/features/page/lib/blockCommands";
import type { BlockEditorProps } from "@/mainview/features/page/types/blockEditorTypes";

export function CalloutBlockContent({
  icon,
  legacyText,
  nestedChildren
}: {
  icon: string;
  legacyText: string;
  nestedChildren?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-1 shrink-0 text-lg" role="img" aria-label="callout icon">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {nestedChildren ??
          (legacyText ? (
            <div className="min-h-7 whitespace-pre-wrap break-words px-1 py-1.5">
              {legacyText}
            </div>
          ) : null)}
      </div>
    </div>
  );
}

type BlockDragHandleSlotProps = Pick<
  BlockEditorProps,
  | "block"
  | "dragHandleVisibility"
  | "onDragEnd"
  | "onDragPointerDown"
  | "onDragStart"
  | "onSelectBlock"
>;

export function BlockDragHandleSlot({
  block,
  dragHandleVisibility,
  onDragEnd,
  onDragPointerDown,
  onDragStart,
  onSelectBlock
}: BlockDragHandleSlotProps) {
  if (dragHandleVisibility === "hidden") {
    return null;
  }

  return (
    <BlockDragHandle
      block={block}
      onDragEnd={onDragEnd}
      onDragPointerDown={onDragPointerDown}
      onSelectBlock={onSelectBlock}
      onDragStart={onDragStart}
      variant={block.type === "callout" ? "callout" : block.parentBlockId ? "nested" : "root"}
    />
  );
}

export function BlockEditorFloatingControls({
  anchorRef,
  isCallout,
  textEditing
}: {
  anchorRef: RefObject<HTMLElement | null>;
  isCallout: boolean;
  textEditing: {
    applyCommand: (command: BlockCommand) => Promise<void> | void;
    applyInlineFormat: (commandId: string) => void;
    applyInlineLink: (href: string) => void;
    isCommandMenuOpen: boolean;
    selectedCommandIndex: number;
    selectionToolbarRect: DOMRect | null;
    setSelectedCommandIndex: (index: number) => void;
    visibleCommands: BlockCommand[];
  };
}) {
  if (isCallout) {
    return null;
  }

  return (
    <>
      {textEditing.isCommandMenuOpen ? (
        <BlockCommandMenu
          activeIndex={textEditing.selectedCommandIndex}
          anchorRef={anchorRef}
          commands={textEditing.visibleCommands}
          onActiveIndexChange={textEditing.setSelectedCommandIndex}
          onSelect={textEditing.applyCommand}
        />
      ) : null}
      <InlineFormattingToolbar
        onFormat={textEditing.applyInlineFormat}
        onLink={textEditing.applyInlineLink}
        rect={textEditing.selectionToolbarRect}
      />
    </>
  );
}
