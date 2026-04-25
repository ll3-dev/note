import type { KeyboardEvent, RefObject } from "react";
import { Textarea } from "@/mainview/components/ui/textarea";
import { cn } from "@/mainview/lib/utils";
import type { Block } from "../../../../shared/contracts";
import { BLOCK_COMMANDS, type BlockCommand } from "../lib/blockCommands";
import { blockShellClass, textareaClass } from "../lib/blockStyles";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type BlockBodyProps = {
  block: Block;
  blockIndex: number;
  checked: boolean;
  draft: string;
  onApplyCommand: (command: BlockCommand) => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function BlockBody({
  block,
  blockIndex,
  checked,
  draft,
  onApplyCommand,
  onBlur,
  onChange,
  onKeyDown,
  onUpdate,
  textareaRef
}: BlockBodyProps) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2", blockShellClass(block.type))}>
      {block.type === "todo" ? (
        <input
          aria-label="완료 여부"
          checked={checked}
          className="mt-2.5 size-4 shrink-0 accent-foreground"
          onChange={(event) =>
            onUpdate(block, {
              props: { ...block.props, checked: event.target.checked }
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
        <Textarea
          aria-label={`${block.type} block`}
          className={cn(
            "min-h-9 resize-none border-0 bg-transparent px-1 py-2 leading-6 shadow-none focus-visible:ring-0",
            textareaClass(block.type),
            checked && block.type === "todo" && "text-muted-foreground line-through"
          )}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          placeholder="Type '/' for commands"
          ref={textareaRef}
          rows={1}
          value={draft}
        />
      )}
    </div>
  );
}
