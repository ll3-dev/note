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
  BlockEditorDragActions,
  SearchHighlight
} from "@/mainview/features/page/types/blockEditorTypes";
import type { SearchResult } from "@/mainview/features/page/lib/pageSearch";

type PageBlockListProps = {
  document: PageDocument;
  dragActions: BlockEditorDragActions;
  editorActions: BlockEditorActions;
  selectionState: {
    draggedBlockId: string | null;
    isBlockRangeSelecting: boolean;
    selectedBlockIds: string[];
  };
  searchMatches?: SearchResult[];
  searchActiveIndex?: number;
  onFocusPreviousBlock: (block: Block, blockIndex: number) => void;
  pages: Page[];
};

export function PageBlockList({
  document,
  dragActions,
  editorActions,
  selectionState,
  searchMatches,
  searchActiveIndex = 0,
  onFocusPreviousBlock,
  pages
}: PageBlockListProps) {
  const numberedListMarkers = getNumberedListMarkers(document.blocks);
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const visibleBlocks = getVisibleBlocks(document.blocks);

  const blockMatches = new Map<string, SearchResult[]>();

  if (searchMatches) {
    for (const match of searchMatches) {
      const existing = blockMatches.get(match.blockId) ?? [];
      existing.push(match);
      blockMatches.set(match.blockId, existing);
    }
  }

  const activeMatch = searchMatches?.[searchActiveIndex];

  return (
    <>
      {visibleBlocks.map((block) => {
        const blockIndex = document.blocks.findIndex((item) => item.id === block.id);
        const highlights = blockMatches.get(block.id)?.map(
          (m): SearchHighlight => ({ length: m.length, offset: m.offset })
        );
        const activeHighlight: SearchHighlight | undefined = activeMatch?.blockId === block.id
          ? { length: activeMatch.length, offset: activeMatch.offset }
          : undefined;

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
            searchHighlights={highlights}
            searchActiveHighlight={activeHighlight}
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
