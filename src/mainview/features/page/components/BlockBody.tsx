import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  RefObject
} from "react";
import { useEffect } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/mainview/lib/utils";
import type { Block, Page } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";
import { BLOCK_COMMANDS, type BlockCommand } from "@/mainview/features/page/lib/blockCommands";
import { getBlockDepth } from "@/mainview/features/page/lib/blockEditingBehavior";
import { blockShellClass, editableClass } from "@/mainview/features/page/lib/blockStyles";
import { useBlockClipboardEditing } from "@/mainview/features/page/hooks/useBlockClipboardEditing";
import { InlineMarksViewer } from "./InlineMarksViewer";
import { ImageBlock } from "./ImageBlock";
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
  linkedPage: Page | null;
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
  onOpenPageLink: (pageId: string) => void;
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
  linkedPage,
  onApplyCommand,
  onBlur,
  onBeforeInput,
  onChange,
  onKeyDown,
  onDragStart,
  onHistoryInput,
  onPasteMarkdown,
  onOpenPageLink,
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

  useEffect(() => {
    const editable = editableRef.current;

    if (!editable) {
      return;
    }

    function handleNativeBeforeInput(event: InputEvent) {
      if (event.inputType !== "historyUndo" && event.inputType !== "historyRedo") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onHistoryInput(event.inputType);
    }

    function handleNativeKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }

      if (document.activeElement !== editable) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      onHistoryInput(event.shiftKey ? "historyRedo" : "historyUndo");
    }

    function handleMenuHistoryCommand(event: Event) {
      if (document.activeElement !== editable) {
        return;
      }

      const command = (event as CustomEvent<"redo" | "undo">).detail;

      if (command !== "undo" && command !== "redo") {
        return;
      }

      onHistoryInput(command === "undo" ? "historyUndo" : "historyRedo");
    }

    window.addEventListener("note-history-command", handleMenuHistoryCommand);
    window.addEventListener("keydown", handleNativeKeyDown, {
      capture: true
    });
    editable.addEventListener("keydown", handleNativeKeyDown, {
      capture: true
    });
    editable.addEventListener("beforeinput", handleNativeBeforeInput, {
      capture: true
    });

    return () => {
      window.removeEventListener("note-history-command", handleMenuHistoryCommand);
      window.removeEventListener("keydown", handleNativeKeyDown, {
        capture: true
      });
      editable.removeEventListener("keydown", handleNativeKeyDown, {
        capture: true
      });
      editable.removeEventListener("beforeinput", handleNativeBeforeInput, {
        capture: true
      });
    };
  }, [editableRef, onHistoryInput]);

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
      {block.type === "toggle" ? (
        <button
          aria-label={isToggleOpen(draftProps) ? "토글 닫기" : "토글 열기"}
          className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            onUpdate(block, {
              props: { ...draftProps, open: !isToggleOpen(draftProps) }
            })
          }
          type="button"
        >
          {isToggleOpen(draftProps) ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      ) : null}
      {block.type === "image" ? (
        <ImageBlock block={block} onUpdate={onUpdate} props={draftProps} />
      ) : block.type === "divider" ? (
        <button
          className="group/divider flex h-7 w-full items-center px-1 outline-none"
          onClick={() => void onApplyCommand(BLOCK_COMMANDS[0])}
          type="button"
        >
          <span className="h-px w-full rounded-full bg-border transition-colors group-hover/divider:bg-muted-foreground/45 group-focus-visible/divider:bg-ring" />
          <span className="sr-only">텍스트 블록으로 변경</span>
        </button>
      ) : block.type === "page_link" ? (
        <button
          className="min-h-8 min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => {
            const targetPageId = getStringProp(draftProps.targetPageId);

            if (targetPageId) {
              onOpenPageLink(targetPageId);
            }
          }}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-[15px] font-semibold text-foreground">
              {getPageTitleDisplay(
                linkedPage?.title ?? getStringProp(draftProps.targetTitle) ?? draft
              )}
            </span>
          </span>
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

function isToggleOpen(props: Block["props"]) {
  return props.open !== false;
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

function getStringProp(value: unknown) {
  return typeof value === "string" ? value : null;
}
