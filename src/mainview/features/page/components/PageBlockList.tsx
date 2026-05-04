import type { Block, Page, PageDocument } from "@/shared/contracts";
import { BlockEditor } from "./BlockEditor";
import {
  getMaxIndentDepth,
  getNumberedListStartAfterDepthChange
} from "@/mainview/features/page/lib/blockIndentTargets";
import { getNumberedListMarkers } from "@/mainview/features/page/lib/blockNumbering";
import {
  buildBlockTree,
  type BlockTreeNode
} from "@/mainview/features/page/lib/blockTree";
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
  const blockTree = buildBlockTree(document.blocks);
  const visibleBlocks = flattenVisibleTree(blockTree);

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
      {blockTree.map((node) => (
        <BlockTreeItem
          activeMatch={activeMatch}
          blockMatches={blockMatches}
          document={document}
          dragActions={dragActions}
          editorActions={editorActions}
          key={node.block.id}
          node={node}
          numberedListMarkers={numberedListMarkers}
          onFocusPreviousBlock={onFocusPreviousBlock}
          pagesById={pagesById}
          searchActiveIndex={searchActiveIndex}
          selectionState={selectionState}
          visibleBlocks={visibleBlocks}
        />
      ))}
    </>
  );
}

function BlockTreeItem({
  activeMatch,
  blockMatches,
  document,
  dragActions,
  editorActions,
  node,
  numberedListMarkers,
  onFocusPreviousBlock,
  pagesById,
  selectionState,
  visibleBlocks
}: {
  activeMatch?: SearchResult;
  blockMatches: Map<string, SearchResult[]>;
  document: PageDocument;
  dragActions: BlockEditorDragActions;
  editorActions: BlockEditorActions;
  node: BlockTreeNode;
  numberedListMarkers: Map<string, number>;
  onFocusPreviousBlock: (block: Block, blockIndex: number) => void;
  pagesById: Map<string, Page>;
  searchActiveIndex: number;
  selectionState: PageBlockListProps["selectionState"];
  visibleBlocks: Block[];
}) {
  const block = node.block;
  const blockIndex = document.blocks.findIndex((item) => item.id === block.id);
  const visibleIndex = visibleBlocks.findIndex((item) => item.id === block.id);
  const highlights = blockMatches.get(block.id)?.map(
    (match): SearchHighlight => ({ length: match.length, offset: match.offset })
  );
  const activeHighlight: SearchHighlight | undefined =
    activeMatch?.blockId === block.id
      ? { length: activeMatch.length, offset: activeMatch.offset }
      : undefined;
  const shouldRenderChildren = node.children.length > 0 && !isCollapsedToggle(block);

  return (
    <BlockEditor
      block={block}
      blockIndex={blockIndex}
      blocksCount={document.blocks.length}
      isDragging={selectionState.draggedBlockId === block.id}
      isBlockRangeSelecting={selectionState.isBlockRangeSelecting}
      isSelected={selectionState.selectedBlockIds.includes(block.id)}
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
      previousBlock={visibleBlocks[visibleIndex - 1] ?? null}
      {...editorActions}
      {...dragActions}
      onFocusPrevious={(target) => onFocusPreviousBlock(target, blockIndex)}
      searchHighlights={highlights}
      searchActiveHighlight={activeHighlight}
      nestedChildren={
        shouldRenderChildren
          ? node.children.map((child) => (
              <BlockTreeItem
                activeMatch={activeMatch}
                blockMatches={blockMatches}
                document={document}
                dragActions={dragActions}
                editorActions={editorActions}
                key={child.block.id}
                node={child}
                numberedListMarkers={numberedListMarkers}
                onFocusPreviousBlock={onFocusPreviousBlock}
                pagesById={pagesById}
                searchActiveIndex={0}
                selectionState={selectionState}
                visibleBlocks={visibleBlocks}
              />
            ))
          : null
      }
    />
  );
}

function getLinkedPage(block: Block, pagesById: Map<string, Page>) {
  const targetPageId =
    typeof block.props.targetPageId === "string" ? block.props.targetPageId : null;

  return targetPageId ? pagesById.get(targetPageId) ?? null : null;
}

function flattenVisibleTree(nodes: BlockTreeNode[]): Block[] {
  return nodes.flatMap((node) => {
    if (isCollapsedToggle(node.block)) {
      return [node.block];
    }

    return [node.block, ...flattenVisibleTree(node.children)];
  });
}

function isCollapsedToggle(block: Block) {
  return block.type === "toggle" && block.props.open === false;
}
