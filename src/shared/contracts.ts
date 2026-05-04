import type { RPCSchema } from "electrobun/bun";

export type DatabaseStatus = {
  sqliteVersion: string;
  pagesCount: number;
  blocksCount: number;
};

export type Page = {
  id: string;
  parentPageId: string | null;
  title: string;
  sortKey: string;
  icon: string | null;
  cover: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "todo"
  | "bulleted_list"
  | "numbered_list"
  | "quote"
  | "code"
  | "toggle"
  | "divider"
  | "image"
  | "page_link"
  | "callout";

export type BlockProps = Record<string, unknown>;

export type Block = {
  id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  sortKey: string;
  text: string;
  props: BlockProps;
  createdAt: string;
  updatedAt: string;
};

export type PageDocument = {
  page: Page;
  blocks: Block[];
};

export type CreatePageInput = {
  title: string;
  parentPageId?: string | null;
};

export type UpdatePageInput = {
  pageId: string;
  title?: string;
};

export type DeletePageInput = {
  pageId: string;
};

export type RestorePageInput = {
  pageId: string;
};

export type GetPageDocumentInput = {
  pageId: string;
};

export type CreateBlockInput = {
  pageId: string;
  parentBlockId?: string | null;
  type?: BlockType;
  text?: string;
  props?: BlockProps;
  afterBlockId?: string | null;
};

export type CreateBlocksInput = {
  blocks: CreateBlockInput[];
};

export type UpdateBlockInput = {
  blockId: string;
  type?: BlockType;
  text?: string;
  props?: BlockProps;
};

export type DeleteBlockInput = {
  blockId: string;
};

export type DeleteBlocksInput = {
  blockIds: string[];
  fallbackBlock?: {
    pageId: string;
    type?: BlockType;
    text?: string;
    props?: BlockProps;
  };
};

export type MoveBlockInput = {
  blockId: string;
  afterBlockId?: string | null;
  parentBlockId?: string | null;
};

export type MoveBlocksInput = {
  blockIds: string[];
  afterBlockId?: string | null;
  parentBlockId?: string | null;
};

export type MovePageInput = {
  pageId: string;
  parentPageId?: string | null;
  afterPageId?: string | null;
};

export type PageHistoryInput = {
  pageId: string;
};

export type SearchPagesInput = {
  query: string;
  limit?: number;
};

export type PageSearchResult = {
  pageId: string;
  title: string;
};

export type ListBacklinksInput = {
  pageId: string;
};

export type Backlink = {
  blockId: string;
  pageId: string;
  pageTitle: string;
  text: string;
};

export type SearchWorkspaceInput = {
  query: string;
  limit?: number;
};

export type SearchWorkspaceResult =
  | {
      kind: "page";
      pageId: string;
      title: string;
    }
  | {
      blockId: string;
      kind: "block";
      pageId: string;
      pageTitle: string;
      text: string;
    };

export type NoteRPC = {
  bun: RPCSchema<{
    requests: {
      getDatabaseStatus: {
        params: void;
        response: DatabaseStatus;
      };
      closeMainWindow: {
        params: void;
        response: { closed: true };
      };
      listPages: {
        params: void;
        response: Page[];
      };
      listArchivedPages: {
        params: void;
        response: Page[];
      };
      searchPages: {
        params: SearchPagesInput;
        response: PageSearchResult[];
      };
      listBacklinks: {
        params: ListBacklinksInput;
        response: Backlink[];
      };
      searchWorkspace: {
        params: SearchWorkspaceInput;
        response: SearchWorkspaceResult[];
      };
      getPageDocument: {
        params: GetPageDocumentInput;
        response: PageDocument;
      };
      createPage: {
        params: CreatePageInput;
        response: PageDocument;
      };
      updatePage: {
        params: UpdatePageInput;
        response: Page;
      };
      deletePage: {
        params: DeletePageInput;
        response: { deleted: true };
      };
      restorePage: {
        params: RestorePageInput;
        response: { restored: true };
      };
      purgeExpiredArchivedPages: {
        params: void;
        response: { purgedCount: number };
      };
      createBlock: {
        params: CreateBlockInput;
        response: Block;
      };
      createBlocks: {
        params: CreateBlocksInput;
        response: Block[];
      };
      updateBlock: {
        params: UpdateBlockInput;
        response: Block;
      };
      deleteBlock: {
        params: DeleteBlockInput;
        response: { deleted: true };
      };
      deleteBlocks: {
        params: DeleteBlocksInput;
        response: { createdBlock?: Block; deleted: true };
      };
      moveBlock: {
        params: MoveBlockInput;
        response: Block;
      };
      moveBlocks: {
        params: MoveBlocksInput;
        response: Block[];
      };
      movePage: {
        params: MovePageInput;
        response: Page;
      };
      redoPageHistory: {
        params: PageHistoryInput;
        response: PageDocument | null;
      };
      undoPageHistory: {
        params: PageHistoryInput;
        response: PageDocument | null;
      };
    };
  }>;
  webview: RPCSchema;
};
