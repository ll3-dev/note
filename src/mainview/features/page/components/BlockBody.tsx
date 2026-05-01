import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  RefObject
} from "react";
import { cn } from "@/mainview/lib/utils";
import type { Block } from "@/shared/contracts";
import { BLOCK_COMMANDS, type BlockCommand } from "@/mainview/features/page/lib/blockCommands";
import { getBlockDepth } from "@/mainview/features/page/lib/blockEditingBehavior";
import { blockShellClass, editableClass } from "@/mainview/features/page/lib/blockStyles";
import { useBlockClipboardEditing } from "@/mainview/features/page/hooks/useBlockClipboardEditing";
import { InlineMarksViewer } from "./InlineMarksViewer";
import type {
  BlockEditorUpdate,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

type BlockBodyProps = {
  block: Block;
  blockIndex: number;
  checked: boolean;
  draft: string;
  draftProps: Block["props"];
  numberedListMarker: number | null;
  isSelected: boolean;
  onApplyCommand: (command: BlockCommand) => Promise<void> | void;
  onBlur: () => Promise<void>;
  onBeforeInput: (event: FormEvent<HTMLDivElement>) => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onHistoryInput: (inputType: "historyRedo" | "historyUndo") => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onSelectionChange: () => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  editableRef: RefObject<HTMLDivElement | null>;
};

export function BlockBody({
  block,
  blockIndex,
  checked,
  draft,
  draftProps,
  numberedListMarker,
  isSelected,
  onApplyCommand,
  onBlur,
  onBeforeInput,
  onChange,
  onKeyDown,
  onDragStart,
  onHistoryInput,
  onPasteMarkdown,
  onSelectionChange,
  onUpdate,
  editableRef
}: BlockBodyProps) {
  const blockDepth = getBlockDepth(block);
  const { handleDrop, handleEditableKeyDown, handlePaste } = useBlockClipboardEditing({
    block,
    onChange,
    onKeyDown,
    onPasteMarkdown
  });

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-1",
        blockShellClass(block.type),
      )}
    >
      {block.type === "todo" ? (
        <input
          aria-label="완료 여부"
          checked={checked}
          className="mt-2.5 size-4 shrink-0 accent-foreground"
          onChange={(event) =>
            onUpdate(block, {
              props: { ...block.props, checked: event.target.checked },
            })
          }
          type="checkbox"
        />
      ) : null}
      {block.type === "bulleted_list" ? (
        <span className="flex h-7 w-3 shrink-0 items-center justify-center">
          <BulletMarker depth={blockDepth} />
        </span>
      ) : null}
      {block.type === "numbered_list" ? (
        <span className="flex h-7 w-5 shrink-0 items-center justify-end text-sm font-medium text-muted-foreground">
          {numberedListMarker ?? blockIndex + 1}.
        </span>
      ) : null}
      {block.type === "divider" ? (
        <button
          className="group/divider flex h-7 w-full items-center px-1 outline-none"
          onClick={() => void onApplyCommand(BLOCK_COMMANDS[0])}
          type="button"
        >
          <span className="h-px w-full rounded-full bg-border transition-colors group-hover/divider:bg-muted-foreground/45 group-focus-visible/divider:bg-ring" />
          <span className="sr-only">텍스트 블록으로 변경</span>
        </button>
      ) : (
        <div className="relative min-w-0 flex-1">
          <InlineMarksViewer
            className={cn(
              editableClass(block.type),
              checked &&
                block.type === "todo" &&
                "text-muted-foreground line-through"
            )}
            props={draftProps}
            text={draft}
          />
          <div
            aria-label={`${block.type} block`}
            className={cn(
              "block-editable min-h-7 w-full min-w-0 whitespace-pre-wrap wrap-break-word rounded-sm bg-transparent px-1 py-1 outline-none",
              editableClass(block.type),
              hasInlineMarks(draftProps) && "text-transparent",
              checked &&
                block.type === "todo" &&
                "text-muted-foreground line-through",
            )}
            contentEditable="plaintext-only"
            data-has-inline-marks={hasInlineMarks(draftProps) ? "true" : undefined}
            data-placeholder="Type '/' for commands"
            draggable={isSelected}
            onBlur={() => void onBlur()}
            onBeforeInput={onBeforeInput}
            onDragStart={(event) => {
              if (isSelected) {
                onDragStart(event);
              }
            }}
            onDrop={handleDrop}
            onFocus={onSelectionChange}
            onInput={(event) => {
              const inputType = (event.nativeEvent as InputEvent).inputType;

              if (inputType === "historyUndo" || inputType === "historyRedo") {
                onHistoryInput(inputType);
                return;
              }

              onChange(event.currentTarget.textContent ?? "");
            }}
            onKeyDownCapture={handleEditableKeyDown}
            onKeyUp={(event) => {
              if (shouldSyncSelectionAfterKey(event.key)) {
                onSelectionChange();
              }
            }}
            onMouseUp={onSelectionChange}
            onPaste={handlePaste}
            ref={editableRef}
            role="textbox"
            spellCheck
            suppressContentEditableWarning
          />
        </div>
      )}
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

function hasInlineMarks(props: Block["props"]) {
  return Array.isArray(props.inlineMarks) && props.inlineMarks.length > 0;
}

function shouldSyncSelectionAfterKey(key: string) {
  return [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown"
  ].includes(key);
}
