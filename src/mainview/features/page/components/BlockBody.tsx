import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { cn } from "@/mainview/lib/utils";
import type { Block } from "../../../../shared/contracts";
import { BLOCK_COMMANDS, type BlockCommand } from "../lib/blockCommands";
import { blockShellClass, editableClass } from "../lib/blockStyles";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type BlockBodyProps = {
  block: Block;
  blockIndex: number;
  checked: boolean;
  onApplyCommand: (command: BlockCommand) => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  editableRef: RefObject<HTMLDivElement | null>;
};

export function BlockBody({
  block,
  blockIndex,
  checked,
  onApplyCommand,
  onBlur,
  onChange,
  onKeyDown,
  onUpdate,
  editableRef
}: BlockBodyProps) {
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
        "flex min-w-0 items-start gap-2",
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
        <span className="mt-2.5 w-4 shrink-0 text-center text-muted-foreground">
          •
        </span>
      ) : null}
      {block.type === "numbered_list" ? (
        <span className="mt-2.5 w-6 shrink-0 text-right text-sm text-muted-foreground">
          {blockIndex + 1}.
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
            "block-editable min-h-9 w-full min-w-0 whitespace-pre-wrap wrap-break-word rounded-sm bg-transparent px-1 py-2 outline-none",
            editableClass(block.type),
            checked &&
              block.type === "todo" &&
              "text-muted-foreground line-through",
          )}
          contentEditable="plaintext-only"
          data-placeholder="Type '/' for commands"
          onBlur={onBlur}
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
