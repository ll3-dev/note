import type { RPCSchema } from "electrobun/bun";

export type DatabaseStatus = {
  sqliteVersion: string;
  pagesCount: number;
  blocksCount: number;
  databasePath: string;
};

export type Page = {
  id: string;
  parentPageId: string | null;
  title: string;
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
  | "todo"
  | "bulleted_list"
  | "numbered_list"
  | "quote"
  | "code"
  | "divider"
  | "image"
  | "page_link";

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

export type UpdateBlockInput = {
  blockId: string;
  type?: BlockType;
  text?: string;
  props?: BlockProps;
};

export type DeleteBlockInput = {
  blockId: string;
};

export type NoteRPC = {
  bun: RPCSchema<{
    requests: {
      getDatabaseStatus: {
        params: void;
        response: DatabaseStatus;
      };
      listPages: {
        params: void;
        response: Page[];
      };
      getPageDocument: {
        params: GetPageDocumentInput;
        response: PageDocument;
      };
      createPage: {
        params: CreatePageInput;
        response: PageDocument;
      };
      createBlock: {
        params: CreateBlockInput;
        response: Block;
      };
      updateBlock: {
        params: UpdateBlockInput;
        response: Block;
      };
      deleteBlock: {
        params: DeleteBlockInput;
        response: { deleted: true };
      };
    };
  }>;
  webview: RPCSchema;
};
