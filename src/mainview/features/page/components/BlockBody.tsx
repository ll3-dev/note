import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { cn } from "@/mainview/lib/utils";
import type { Block } from "../../../../shared/contracts";
import { BLOCK_COMMANDS, type BlockCommand } from "../lib/blockCommands";
import { getBlockDepth } from "../lib/blockEditingBehavior";
import { blockShellClass, editableClass } from "../lib/blockStyles";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type BlockBodyProps = {
  block: Block;
  blockIndex: number;
  checked: boolean;
  numberedListMarker: number | null;
  onApplyCommand: (command: BlockCommand) => void;
  onBlur: () => Promise<void>;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  editableRef: RefObject<HTMLDivElement | null>;
};

export function BlockBody({
  block,
  blockIndex,
  checked,
  numberedListMarker,
  onApplyCommand,
  onBlur,
  onChange,
  onKeyDown,
  onUpdate,
  editableRef
}: BlockBodyProps) {
  const blockDepth = getBlockDepth(block);

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    const selection = window.getSelection();

    if (!selection?.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(window.document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    onChange(event.currentTarget.textContent ?? "");
  }

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
          className="my-4 h-px w-full rounded bg-border"
          onClick={() => onApplyCommand(BLOCK_COMMANDS[0])}
          type="button"
        >
          <span className="sr-only">텍스트 블록으로 변경</span>
        </button>
      ) : (
        <div
          aria-label={`${block.type} block`}
          className={cn(
            "block-editable min-h-7 w-full min-w-0 whitespace-pre-wrap wrap-break-word rounded-sm bg-transparent px-1 py-1 outline-none",
            editableClass(block.type),
            checked &&
              block.type === "todo" &&
              "text-muted-foreground line-through",
          )}
          contentEditable="plaintext-only"
          data-placeholder="Type '/' for commands"
          onBlur={() => void onBlur()}
          onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          ref={editableRef}
          role="textbox"
          spellCheck
          suppressContentEditableWarning
        />
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
