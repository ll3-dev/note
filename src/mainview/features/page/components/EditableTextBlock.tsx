import type {
  DragEvent,
  InputEvent as ReactInputEvent,
  KeyboardEvent,
  RefObject
} from "react";
import { cn } from "@/mainview/lib/utils";
import type { Block } from "@/shared/contracts";
import { editableClass } from "@/mainview/features/page/lib/blockStyles";
import { useBlockClipboardEditing } from "@/mainview/features/page/hooks/useBlockClipboardEditing";
import { useInlinePageLinkEditing } from "@/mainview/features/page/hooks/useInlinePageLinkEditing";
import { InlineMarksViewer } from "./InlineMarksViewer";
import { InlinePageSearchMenu } from "./InlinePageSearchMenu";
import { SearchHighlightOverlay } from "./SearchHighlightOverlay";
import type {
  InlinePageLinkApplyMode,
  SearchHighlight,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

export type EditableTextBlockState = {
  block: Block;
  checked: boolean;
  draft: string;
  draftProps: Block["props"];
  editableRef: RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  searchHighlights?: SearchHighlight[];
  searchActiveHighlight?: SearchHighlight;
};

export type EditableTextBlockActions = {
  onBeforeInput: (event: ReactInputEvent<HTMLDivElement>) => void;
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
  onApplyInlinePageLink: (
    text: string,
    props: Block["props"],
    cursorOffset: number,
    mode?: InlinePageLinkApplyMode
  ) => void;
  onOpenPageLink: (pageId: string) => void;
  onSelectionChange: () => void;
};

type EditableTextBlockProps = {
  actions: EditableTextBlockActions;
  state: EditableTextBlockState;
};

export function EditableTextBlock({
  actions,
  state
}: EditableTextBlockProps) {
  const {
    block,
    checked,
    draft,
    draftProps,
    editableRef,
    isSelected,
    searchActiveHighlight,
    searchHighlights
  } = state;
  const {
    onBeforeInput,
    onBlur,
    onChange,
    onDragStart,
    onHistoryInput,
    onKeyDown,
    onPasteMarkdown,
    onApplyInlinePageLink,
    onOpenPageLink,
    onSelectionChange
  } = actions;
  const { handleDrop, handleEditableKeyDown, handlePaste } = useBlockClipboardEditing({
    block,
    onChange,
    onKeyDown,
    onPasteMarkdown
  });
  const {
    closeInlineSearch,
    handleEditableInput,
    handlePageSelect,
    inlineSearchRect,
    triggerState
  } = useInlinePageLinkEditing({
    draft,
    draftProps,
    editableRef,
    onApplyInlinePageLink
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
        onOpenPageLink={onOpenPageLink}
        props={draftProps}
        text={draft}
      />
      {searchHighlights && searchHighlights.length > 0 ? (
        <SearchHighlightOverlay
          highlights={searchHighlights}
          activeHighlight={searchActiveHighlight}
          text={draft}
        />
      ) : null}
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
        data-block-focus-target
        data-block-focus-target-id={block.id}
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

          const nextValue = event.currentTarget.textContent ?? "";
          onChange(nextValue);
          handleEditableInput(nextValue);
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
      {triggerState?.active && (
        <InlinePageSearchMenu
          onClose={closeInlineSearch}
          onSelect={handlePageSelect}
          query={triggerState.query}
          rect={inlineSearchRect}
        />
      )}
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
