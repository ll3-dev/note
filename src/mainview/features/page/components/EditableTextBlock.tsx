import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  RefObject
} from "react";
import { cn } from "@/mainview/lib/utils";
import type { Block } from "@/shared/contracts";
import { editableClass } from "@/mainview/features/page/lib/blockStyles";
import { useBlockClipboardEditing } from "@/mainview/features/page/hooks/useBlockClipboardEditing";
import { InlineMarksViewer } from "./InlineMarksViewer";
import type { TextSelectionOffsets } from "@/mainview/features/page/types/blockEditorTypes";

type EditableTextBlockProps = {
  block: Block;
  checked: boolean;
  draft: string;
  draftProps: Block["props"];
  editableRef: RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  onBeforeInput: (event: FormEvent<HTMLDivElement>) => void;
  onBlur: () => Promise<void>;
  onChange: (value: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onHistoryInput: (inputType: "historyRedo" | "historyUndo") => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onSelectionChange: () => void;
};

export function EditableTextBlock({
  block,
  checked,
  draft,
  draftProps,
  editableRef,
  isSelected,
  onBeforeInput,
  onBlur,
  onChange,
  onDragStart,
  onHistoryInput,
  onKeyDown,
  onPasteMarkdown,
  onSelectionChange
}: EditableTextBlockProps) {
  const { handleDrop, handleEditableKeyDown, handlePaste } = useBlockClipboardEditing({
    block,
    onChange,
    onKeyDown,
    onPasteMarkdown
  });
  const isCheckedTodo = checked && block.type === "todo";
  const hasMarks = hasInlineMarks(draftProps);

  return (
    <div className="relative min-w-0 flex-1">
      <InlineMarksViewer
        className={cn(
          editableClass(block.type),
          isCheckedTodo && "text-muted-foreground line-through"
        )}
        props={draftProps}
        text={draft}
      />
      <div
        aria-label={`${block.type} block`}
        className={cn(
          "block-editable min-h-7 w-full min-w-0 whitespace-pre-wrap wrap-break-word rounded-sm bg-transparent px-1 py-1 outline-none",
          editableClass(block.type),
          hasMarks && "text-transparent",
          isCheckedTodo && "text-muted-foreground line-through"
        )}
        contentEditable="plaintext-only"
        data-has-inline-marks={hasMarks ? "true" : undefined}
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
  );
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
