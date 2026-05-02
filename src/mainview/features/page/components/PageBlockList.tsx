import type { Block, Page, PageDocument } from "@/shared/contracts";
import { BlockEditor } from "./BlockEditor";
import {
  getMaxIndentDepth,
  getNumberedListStartAfterDepthChange
} from "@/mainview/features/page/lib/blockIndentTargets";
import { getNumberedListMarkers } from "@/mainview/features/page/lib/blockNumbering";
import { getVisibleBlocks } from "@/mainview/features/page/lib/blockTree";
import type {
  BlockEditorActions,
  BlockEditorDragActions
} from "@/mainview/features/page/types/blockEditorTypes";

type PageBlockListProps = {
  document: PageDocument;
  dragActions: BlockEditorDragActions;
  editorActions: BlockEditorActions;
  selectionState: {
    draggedBlockId: string | null;
    isBlockRangeSelecting: boolean;
    selectedBlockIds: string[];
  };
  onFocusPreviousBlock: (block: Block, blockIndex: number) => void;
  pages: Page[];
};

export function PageBlockList({
  document,
  dragActions,
  editorActions,
  selectionState,
  onFocusPreviousBlock,
  pages
}: PageBlockListProps) {
  const numberedListMarkers = getNumberedListMarkers(document.blocks);
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const visibleBlocks = getVisibleBlocks(document.blocks);

  return (
    <>
      {visibleBlocks.map((block) => {
        const blockIndex = document.blocks.findIndex((item) => item.id === block.id);

        return (
          <BlockEditor
            block={block}
            blockIndex={blockIndex}
            blocksCount={document.blocks.length}
            isDragging={selectionState.draggedBlockId === block.id}
            isBlockRangeSelecting={selectionState.isBlockRangeSelecting}
            isSelected={selectionState.selectedBlockIds.includes(block.id)}
            key={block.id}
            maxIndentDepth={getMaxIndentDepth(document.blocks, blockIndex)}
            numberedListMarker={numberedListMarkers.get(block.id) ?? null}
            numberedListStartAfterIndent={getNumberedListStartAfterDepthChange(
              document.blocks,
              blockIndex,
              "in",
              numberedListMarkers
            )}
            numberedListStartAfterOutdent={getNumberedListStartAfterDepthChange(
              document.blocks,
              blockIndex,
              "out",
              numberedListMarkers
            )}
            linkedPage={getLinkedPage(block, pagesById)}
            previousBlock={document.blocks[blockIndex - 1] ?? null}
            {...editorActions}
            {...dragActions}
            onFocusPrevious={(target) => onFocusPreviousBlock(target, blockIndex)}
          />
        );
      })}
    </>
  );
}

function getLinkedPage(block: Block, pagesById: Map<string, Page>) {
  const targetPageId =
    typeof block.props.targetPageId === "string" ? block.props.targetPageId : null;

  return targetPageId ? pagesById.get(targetPageId) ?? null : null;
}
