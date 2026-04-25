import { GripVertical, Trash2 } from "lucide-react";
import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import { BlockBody } from "./BlockBody";
import { BlockCommandMenu } from "./BlockCommandMenu";
import {
  BLOCK_COMMANDS,
  type BlockCommand,
  getMarkdownShortcut
} from "../lib/blockCommands";
import type { BlockEditorProps } from "../types/blockEditorTypes";

export function BlockEditor({
  block,
  blockIndex,
  blocksCount,
  isDeleting,
  onCreateAfter,
  onDelete,
  onFocusPrevious,
  onUpdate
}: BlockEditorProps) {
  const [draft, setDraft] = useState(block.text);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const checked = Boolean(block.props.checked);
  const commandQuery = draft.startsWith("/") ? draft.slice(1).toLowerCase() : "";
  const visibleCommands = useMemo(
    () =>
      BLOCK_COMMANDS.filter((command) =>
        command.label.toLowerCase().includes(commandQuery)
      ),
    [commandQuery]
  );

  useEffect(() => {
    setDraft(block.text);
  }, [block.id, block.text]);

  useEffect(() => {
    setIsCommandMenuOpen(draft.startsWith("/"));
  }, [draft]);

  function commitDraft() {
    if (draft !== block.text) {
      onUpdate(block, { text: draft });
    }
  }

  function applyCommand(command: BlockCommand) {
    const nextProps =
      command.type === "todo" ? { checked: checked, ...command.props } : {};
    const nextText = draft.startsWith("/") ? "" : draft;

    setDraft(nextText);
    setIsCommandMenuOpen(false);
    onUpdate(block, {
      props: nextProps,
      text: nextText,
      type: command.type
    });
    textareaRef.current?.focus();
  }

  function handleDraftChange(nextValue: string) {
    const shortcut = getMarkdownShortcut(nextValue);

    if (shortcut) {
      setDraft(shortcut.text);
      setIsCommandMenuOpen(false);
      onUpdate(block, shortcut);
      return;
    }

    setDraft(nextValue);
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitDraft();
      await onCreateAfter(block);
      return;
    }

    if (event.key === "Backspace" && draft.length === 0 && blocksCount > 1) {
      event.preventDefault();
      onFocusPrevious(block);
      onDelete(block);
      return;
    }

    if (event.key === "Escape" && isCommandMenuOpen) {
      event.preventDefault();
      setIsCommandMenuOpen(false);
    }
  }

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[28px_minmax(0,1fr)_32px] items-start gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60",
        block.type === "quote" && "bg-muted/30"
      )}
      data-block-id={block.id}
    >
      <div className="flex h-9 items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="size-4" />
      </div>

      <div className="min-w-0">
        <BlockBody
          block={block}
          blockIndex={blockIndex}
          checked={checked}
          draft={draft}
          onApplyCommand={applyCommand}
          onBlur={commitDraft}
          onChange={handleDraftChange}
          onKeyDown={(event) => void handleKeyDown(event)}
          onUpdate={onUpdate}
          textareaRef={textareaRef}
        />

        {isCommandMenuOpen ? (
          <BlockCommandMenu
            commands={visibleCommands}
            onSelect={applyCommand}
          />
        ) : null}
      </div>

      <Button
        aria-label="block 삭제"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        disabled={isDeleting || blocksCount <= 1}
        onClick={() => onDelete(block)}
        size="icon-sm"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
