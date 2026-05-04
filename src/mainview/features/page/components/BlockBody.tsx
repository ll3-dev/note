import type {
  DragEvent,
  InputEvent as ReactInputEvent,
  KeyboardEvent,
  RefObject
} from "react";
import { cn } from "@/mainview/lib/utils";
import type { Block, Page } from "@/shared/contracts";
import { getBlockDepth } from "@/mainview/features/page/lib/blockEditingBehavior";
import { blockShellClass } from "@/mainview/features/page/lib/blockStyles";
import { useEditableHistoryInput } from "@/mainview/features/page/hooks/useEditableHistoryInput";
import {
  EditableTextBlock,
  type EditableTextBlockActions,
  type EditableTextBlockState
} from "./EditableTextBlock";
import {
  BulletedListMarker,
  CalloutMarker,
  DividerBlockBody,
  NumberedListMarker,
  TodoMarker,
  ToggleMarker
} from "./BlockBodyParts";
import { ImageBlock } from "./ImageBlock";
import { PageLinkBlock } from "./PageLinkBlock";
import type {
  BlockEditorUpdate,
  InlinePageLinkApplyMode,
  OpenPageLinkOptions,
  SearchHighlight,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

export type BlockBodyState = {
  block: Block;
  blockIndex: number;
  checked: boolean;
  draft: string;
  draftProps: Block["props"];
  numberedListMarker: number | null;
  isSelected: boolean;
  linkedPage: Page | null;
  editableRef: RefObject<HTMLDivElement | null>;
  searchHighlights?: SearchHighlight[];
  searchActiveHighlight?: SearchHighlight;
};

export type BlockBodyActions = {
  onBlur: () => Promise<void>;
  onBeforeInput: (event: ReactInputEvent<HTMLDivElement>) => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onHistoryInput: (inputType: "historyRedo" | "historyUndo") => void;
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
  onOpenPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  onRestorePageLink: (pageId: string) => void;
  onSelectionChange: () => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};

type BlockBodyProps = {
  actions: BlockBodyActions;
  state: BlockBodyState;
};

export function BlockBody({
  actions,
  state
}: BlockBodyProps) {
  const {
    block,
    blockIndex,
    checked,
    draft,
    draftProps,
    numberedListMarker,
    isSelected,
    linkedPage,
    editableRef,
    searchActiveHighlight,
    searchHighlights
  } = state;
  const {
    onBlur,
    onBeforeInput,
    onChange,
    onKeyDown,
    onDragStart,
    onHistoryInput,
    onPasteMarkdown,
    onApplyInlinePageLink,
    onOpenPageLink,
    onRestorePageLink,
    onSelectionChange,
    onUpdate
  } = actions;
  const blockDepth = getBlockDepth(block);
  const isToggleOpen = draftProps.open !== false;
  useEditableHistoryInput({ editableRef, onHistoryInput });
  const editableState: EditableTextBlockState = {
    block,
    checked,
    draft,
    draftProps,
    editableRef,
    isSelected,
    searchActiveHighlight,
    searchHighlights
  };
  const editableActions: EditableTextBlockActions = {
    onApplyInlinePageLink,
    onBeforeInput,
    onBlur,
    onChange,
    onDragStart,
    onHistoryInput,
    onKeyDown,
    onOpenPageLink,
    onPasteMarkdown,
    onSelectionChange
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-1",
        blockShellClass(block.type)
      )}
    >
      {block.type === "todo" ? (
        <TodoMarker
          block={block}
          checked={checked}
          onCheckedChange={(target, nextChecked) =>
            onUpdate(target, {
              props: { ...target.props, checked: nextChecked }
            })
          }
        />
      ) : null}
      {block.type === "bulleted_list" ? (
        <BulletedListMarker depth={blockDepth} />
      ) : null}
      {block.type === "numbered_list" ? (
        <NumberedListMarker blockIndex={blockIndex} marker={numberedListMarker} />
      ) : null}
      {block.type === "toggle" ? (
        <ToggleMarker
          isOpen={isToggleOpen}
          onToggle={() =>
            onUpdate(block, {
              props: { ...draftProps, open: !isToggleOpen }
            })
          }
        />
      ) : null}
      {block.type === "callout" ? (
        <CalloutMarker icon={draftProps.icon} />
      ) : null}
      {block.type === "image" ? (
        <ImageBlock block={block} onUpdate={onUpdate} props={draftProps} />
      ) : block.type === "divider" ? (
        <DividerBlockBody />
      ) : block.type === "page_link" ? (
        <PageLinkBlock
          blockId={block.id}
          draft={draft}
          draftProps={draftProps}
          linkedPage={linkedPage}
          onKeyDown={onKeyDown}
          onOpenPageLink={onOpenPageLink}
          onRestorePageLink={onRestorePageLink}
        />
      ) : (
        <EditableTextBlock
          actions={editableActions}
          state={editableState}
        />
      )}
    </div>
  );
}
