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
import { useInlinePageSearch } from "@/mainview/features/page/hooks/useInlinePageSearch";
import { InlineMarksViewer } from "./InlineMarksViewer";
import { InlinePageSearchMenu } from "./InlinePageSearchMenu";
import { getInlinePageLinkProps } from "@/mainview/features/page/lib/inlineFormatting";
import { getCursorTextOffset } from "@/mainview/features/page/web/domSelection";
import type { TextSelectionOffsets } from "@/mainview/features/page/types/blockEditorTypes";
import type { SearchHighlight } from "@/mainview/features/page/types/blockEditorTypes";

type EditableTextBlockProps = {
  block: Block;
  checked: boolean;
  draft: string;
  draftProps: Block["props"];
  editableRef: RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  onApplyPageLink?: (block: Block, changes: { props: Block["props"]; text: string }) => void;
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
  searchHighlights?: SearchHighlight[];
  searchActiveHighlight?: SearchHighlight;
};

export function EditableTextBlock({
  block,
  checked,
  draft,
  draftProps,
  editableRef,
  isSelected,
  onApplyPageLink,
  onBeforeInput,
  onBlur,
  onChange,
  onDragStart,
  onHistoryInput,
  onKeyDown,
  onPasteMarkdown,
  onSelectionChange,
  searchHighlights,
  searchActiveHighlight
}: EditableTextBlockProps) {
  const { handleDrop, handleEditableKeyDown, handlePaste } = useBlockClipboardEditing({
    block,
    onChange,
    onKeyDown,
    onPasteMarkdown
  });
  const { triggerState, checkTrigger, closeSearch } = useInlinePageSearch();
  const isCheckedTodo = checked && block.type === "todo";
  const hasMarks = hasInlineMarks(draftProps);

  function handlePageSelect(pageId: string, pageTitle: string) {
    if (!triggerState || !editableRef.current) return;

    const text = draft;
    const triggerEnd = triggerState.triggerOffset + (triggerState.triggerChar === "[[" ? 2 : 1);
    const queryEnd = triggerEnd + triggerState.query.length;

    const beforeTrigger = text.slice(0, triggerState.triggerOffset);
    const afterQuery = text.slice(queryEnd);
    const newText = beforeTrigger + pageTitle + afterQuery;

    const markStart = beforeTrigger.length;
    const markEnd = markStart + pageTitle.length;
    const newProps = getInlinePageLinkProps(draftProps, { start: markStart, end: markEnd }, pageId);

    if (newProps) {
      editableRef.current.textContent = newText;
      onChange(newText);
      if (onApplyPageLink) {
        onApplyPageLink(block, { props: newProps, text: newText });
      }
    }

    closeSearch();
  }

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

          // Check for page link triggers
          if (editableRef.current) {
            const offset = getCursorTextOffset(editableRef.current);
            if (offset !== null) {
              checkTrigger(nextValue, offset);
            }
          }
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
          onClose={closeSearch}
          onSelect={handlePageSelect}
          query={triggerState.query}
          rect={editableRef.current?.getBoundingClientRect() ?? null}
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

function SearchHighlightOverlay({
  highlights,
  activeHighlight,
  text
}: {
  highlights: SearchHighlight[];
  activeHighlight?: SearchHighlight;
  text: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 whitespace-pre-wrap wrap-break-word px-1 py-1"
    >
      {buildHighlightSegments(text, highlights, activeHighlight).map((segment) => (
        <span
          className={cn(
            segment.isActive && "bg-orange-300/60 rounded-sm",
            segment.isHighlight && "bg-yellow-200/60 rounded-sm"
          )}
          key={segment.key}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}

type HighlightSegment = {
  isActive: boolean;
  isHighlight: boolean;
  key: string;
  text: string;
};

function buildHighlightSegments(
  text: string,
  highlights: SearchHighlight[],
  activeHighlight?: SearchHighlight
): HighlightSegment[] {
  const points = new Set<number>();

  points.add(0);
  points.add(text.length);

  for (const h of highlights) {
    points.add(h.offset);
    points.add(h.offset + h.length);
  }

  const sorted = Array.from(points).sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];

    if (start === end) continue;

    const isHighlight = highlights.some(
      (h) => h.offset <= start && h.offset + h.length >= end
    );
    const isActive = activeHighlight
      ? activeHighlight.offset <= start && activeHighlight.offset + activeHighlight.length >= end
      : false;

    segments.push({
      isActive,
      isHighlight: isHighlight && !isActive,
      key: `${start}-${end}`,
      text: text.slice(start, end)
    });
  }

  return segments;
}
