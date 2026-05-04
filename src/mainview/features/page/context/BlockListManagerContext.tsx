import { createContext, useContext, type ReactNode } from "react";
import type { Block, Page, PageDocument } from "@/shared/contracts";
import type { SearchResult } from "@/mainview/features/page/lib/pageSearch";
import type {
  BlockEditorActions,
  BlockEditorDragActions
} from "@/mainview/features/page/types/blockEditorTypes";

export type BlockListSelectionState = {
  draggedBlockId: string | null;
  isBlockRangeSelecting: boolean;
  selectedBlockIds: string[];
};

export type BlockListManager = {
  activeMatch?: SearchResult;
  blockMatches: Map<string, SearchResult[]>;
  document: PageDocument;
  dragActions: BlockEditorDragActions;
  editorActions: BlockEditorActions;
  numberedListMarkers: Map<string, number>;
  onFocusPreviousBlock: (block: Block, blockIndex: number) => void;
  pagesById: Map<string, Page>;
  selectionState: BlockListSelectionState;
  visibleBlocks: Block[];
};

const BlockListManagerContext = createContext<BlockListManager | null>(null);

export function BlockListManagerProvider({
  children,
  manager
}: {
  children: ReactNode;
  manager: BlockListManager;
}) {
  return (
    <BlockListManagerContext.Provider value={manager}>
      {children}
    </BlockListManagerContext.Provider>
  );
}

export function useBlockListManager() {
  const manager = useContext(BlockListManagerContext);

  if (!manager) {
    throw new Error("useBlockListManager must be used inside BlockListManagerProvider");
  }

  return manager;
}
