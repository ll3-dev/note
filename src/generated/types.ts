export type EngineClient = {
  invoke<T>(command: string, args?: unknown): Promise<T>;
};

export type RustraError = {
  readonly code: string;
  readonly message: string;
};

export type CreateBlockInput = {
  afterBlockId?: string | null;
  pageId: string;
  parentBlockId?: string | null;
  props?: unknown;
  text?: string | null;
  type?: string | null;
};

export type Block = {
  createdAt: string;
  id: string;
  pageId: string;
  parentBlockId?: string | null;
  props: unknown;
  sortKey: string;
  text: string;
  type: string;
  updatedAt: string;
};

export type CreateBlocksInput = {
  blocks: CreateBlockInput[];
};

export type Block> = Block[];

export type CreatePageInput = {
  parentPageId?: string | null;
  title: string;
};

export type PageDocument = {
  blocks: Block[];
  page: Page;
};

export type EmptyInput = Record<string, unknown>;

export type DatabaseStatus = {
  blocks_count: number;
  database_path: string;
  pages_count: number;
  sqlite_version: string;
};

export type DeleteBlockInput = {
  blockId: string;
};

export type DeleteBlockOutput = {
  deleted: boolean;
};

export type DeleteBlocksInput = {
  blockIds: string[];
  fallbackBlock?: FallbackBlockInput | null;
};

export type DeleteBlocksOutput = {
  createdBlock?: Block | null;
  deleted: boolean;
};

export type DeletePageInput = {
  pageId: string;
};

export type DeletePageOutput = {
  deleted: boolean;
};

export type EngineInfoOutput = {
  apiVersion: string;
  capabilities: string[];
  engineVersion: string;
};

export type GetPageDocumentInput = {
  pageId: string;
};

export type Page> = Page[];

export type ListBacklinksInput = {
  pageId: string;
};

export type Backlink> = Backlink[];

export type BridgeMoveBlockInput = {
  afterBlockId?: string | null;
  blockId: string;
  parentBlockId?: string | null;
};

export type BridgeMoveBlocksInput = {
  afterBlockId?: string | null;
  blockIds: string[];
  parentBlockId?: string | null;
};

export type MovePageInput = {
  afterPageId?: string | null;
  pageId: string;
  parentPageId?: string | null;
};

export type Page = {
  archivedAt?: string | null;
  cover?: string | null;
  createdAt: string;
  icon?: string | null;
  id: string;
  parentPageId?: string | null;
  sortKey: string;
  title: string;
  updatedAt: string;
};

export type PurgeExpiredArchivedPagesOutput = {
  purgedCount: number;
};

export type PageHistoryInput = {
  pageId: string;
};

export type PageDocument> = PageDocument | null;

export type RestorePageInput = {
  pageId: string;
};

export type RestorePageOutput = {
  restored: boolean;
};

export type SearchPagesInput = {
  limit?: number | null;
  query: string;
};

export type PageSearchResult> = PageSearchResult[];

export type SearchWorkspaceInput = {
  limit?: number | null;
  query: string;
};

export type SearchWorkspaceResult> = SearchWorkspaceResult[];

export type UpdateBlockInput = {
  blockId: string;
  props?: unknown;
  text?: string | null;
  type?: string | null;
};

export type UpdatePageInput = {
  pageId: string;
  title?: string | null;
};

