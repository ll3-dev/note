import { useRef, type DragEvent, type MouseEvent } from "react";
import type { Block, PageDocument } from "@/shared/contracts";
import type { PageTitleEditorHandle } from "@/mainview/features/page/components/PageTitleEditor";
import { getNativeTextSelectionBlock } from "@/mainview/features/page/web/pageSelectionHitTest";

type UsePageEditorInteractionsOptions = {
  document: PageDocument;
  selectedBlockIds: string[];
  onBeginBlockSelectionDrag: (
    event: MouseEvent<HTMLDivElement>,
    options?: { handoffBlockElement?: HTMLElement }
  ) => boolean;
  onClearBlockSelection: () => void;
  onConsumeCompletedBlockRangeSelection: () => boolean;
  onFocusLastBlock: (event: MouseEvent<HTMLDivElement>) => boolean;
  onFocusPreviousBlock: (block: Block) => boolean;
  onStartDrag: (block: Block, event?: DragEvent<HTMLElement>) => void;
};

export function usePageEditorInteractions({
  document,
  selectedBlockIds,
  onBeginBlockSelectionDrag,
  onClearBlockSelection,
  onConsumeCompletedBlockRangeSelection,
  onFocusLastBlock,
  onFocusPreviousBlock,
  onStartDrag
}: UsePageEditorInteractionsOptions) {
  const titleRef = useRef<PageTitleEditorHandle>(null);
  const selectedBlocks = document.blocks.filter((block) =>
    selectedBlockIds.includes(block.id)
  );

  function handleEditorMouseDown(event: MouseEvent<HTMLDivElement>) {
    const nativeTextBlock = getNativeTextSelectionBlock(event);

    if (nativeTextBlock) {
      const selectedBlockId = nativeTextBlock.dataset.blockId;

      if (selectedBlockId && selectedBlockIds.includes(selectedBlockId)) {
        return;
      }

      onClearBlockSelection();
      onBeginBlockSelectionDrag(event, { handoffBlockElement: nativeTextBlock });
      return;
    }

    if (onBeginBlockSelectionDrag(event)) {
      event.preventDefault();
      return;
    }

    onFocusLastBlock(event);
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    if (onConsumeCompletedBlockRangeSelection()) {
      return;
    }

    if (onFocusLastBlock(event)) {
      onClearBlockSelection();
    }
  }

  function handleSelectedBlocksDragStart(event: DragEvent<HTMLDivElement>) {
    const firstSelectedBlock = selectedBlocks[0];
    if (!firstSelectedBlock) {
      event.preventDefault();
      return;
    }
    onStartDrag(firstSelectedBlock, event);
  }

  function focusPreviousBlock(block: Block, blockIndex: number) {
    if (blockIndex === 0 || !onFocusPreviousBlock(block)) {
      titleRef.current?.focus();
    }
  }

  return {
    focusPreviousBlock,
    handleEditorClick,
    handleEditorMouseDown,
    handleSelectedBlocksDragStart,
    selectedBlocks,
    titleRef
  };
}
