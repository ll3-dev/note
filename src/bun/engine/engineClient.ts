import type {
  Backlink,
  Block,
  CreateBlockInput,
  CreateBlocksInput,
  CreatePageInput,
  DatabaseStatus,
  DeleteBlockInput,
  DeleteBlocksInput,
  DeletePageInput,
  GetPageDocumentInput,
  ListBacklinksInput,
  MoveBlockInput,
  MoveBlocksInput,
  MovePageInput,
  Page,
  PageDocument,
  PageSearchResult,
  RestorePageInput,
  SearchPagesInput,
  SearchWorkspaceInput,
  SearchWorkspaceResult,
  UpdateBlockInput,
  UpdatePageInput
} from "@/shared/contracts";

export type EngineClient = {
  createBlock: (input: CreateBlockInput) => Promise<Block>;
  createBlocks: (input: CreateBlocksInput) => Promise<Block[]>;
  createPage: (input: CreatePageInput) => Promise<PageDocument>;
  deleteBlock: (input: DeleteBlockInput) => Promise<{ deleted: true }>;
  deleteBlocks: (
    input: DeleteBlocksInput
  ) => Promise<{ createdBlock?: Block; deleted: true }>;
  deletePage: (input: DeletePageInput) => Promise<{ deleted: true }>;
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  getPageDocument: (input: GetPageDocumentInput) => Promise<PageDocument>;
  listBacklinks: (input: ListBacklinksInput) => Promise<Backlink[]>;
  listArchivedPages: () => Promise<Page[]>;
  listPages: () => Promise<Page[]>;
  moveBlock: (input: MoveBlockInput) => Promise<Block>;
  moveBlocks: (input: MoveBlocksInput) => Promise<Block[]>;
  movePage: (input: MovePageInput) => Promise<Page>;
  purgeExpiredArchivedPages: () => Promise<{ purgedCount: number }>;
  restorePage: (input: RestorePageInput) => Promise<{ restored: true }>;
  searchPages: (input: SearchPagesInput) => Promise<PageSearchResult[]>;
  searchWorkspace: (
    input: SearchWorkspaceInput
  ) => Promise<SearchWorkspaceResult[]>;
  updateBlock: (input: UpdateBlockInput) => Promise<Block>;
  updatePage: (input: UpdatePageInput) => Promise<Page>;
};

export function createEngineClient(baseUrl: string, token: string): EngineClient {
  async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`engine request failed: ${path} ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function sendJson<T>(
    method: "PATCH" | "POST",
    path: string,
    body: unknown
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      method
    });

    if (!response.ok) {
      throw new Error(`engine request failed: ${method} ${path} ${response.status}`);
    }

    return (await response.json()) as T;
  }

  return {
    createBlock(input) {
      return sendJson<Block>("POST", "/blocks", input);
    },
    createBlocks(input) {
      return sendJson<Block[]>("POST", "/blocks/batch", input);
    },
    createPage(input) {
      return sendJson<PageDocument>("POST", "/pages", input);
    },
    deleteBlock(input) {
      return sendJson<{ deleted: true }>("POST", "/blocks/delete", input);
    },
    deleteBlocks(input) {
      return sendJson<{ createdBlock?: Block; deleted: true }>(
        "POST",
        "/blocks/delete-batch",
        input
      );
    },
    deletePage(input) {
      return sendJson<{ deleted: true }>("POST", "/pages/archive", input);
    },
    async getDatabaseStatus() {
      const status = await getJson<{
        sqlite_version: string;
        pages_count: number;
        blocks_count: number;
      }>("/database/status");

      return {
        sqliteVersion: status.sqlite_version,
        pagesCount: status.pages_count,
        blocksCount: status.blocks_count
      };
    },
    getPageDocument(input) {
      return getJson<PageDocument>(
        `/pages/${encodeURIComponent(input.pageId)}/document`
      );
    },
    listBacklinks(input) {
      return getJson<Backlink[]>(
        `/pages/${encodeURIComponent(input.pageId)}/backlinks`
      );
    },
    listArchivedPages() {
      return getJson<Page[]>("/pages/archived");
    },
    listPages() {
      return getJson<Page[]>("/pages");
    },
    moveBlock(input) {
      return sendJson<Block>("POST", "/blocks/move", input);
    },
    moveBlocks(input) {
      return sendJson<Block[]>("POST", "/blocks/move-batch", input);
    },
    movePage(input) {
      return sendJson<Page>("POST", "/pages/move", input);
    },
    purgeExpiredArchivedPages() {
      return sendJson<{ purgedCount: number }>(
        "POST",
        "/pages/purge-expired-archived",
        {}
      );
    },
    restorePage(input) {
      return sendJson<{ restored: true }>("POST", "/pages/restore", input);
    },
    searchPages(input) {
      return getJson<PageSearchResult[]>(
        `/search/pages?${new URLSearchParams(toSearchParams(input))}`
      );
    },
    searchWorkspace(input) {
      return getJson<SearchWorkspaceResult[]>(
        `/search/workspace?${new URLSearchParams(toSearchParams(input))}`
      );
    },
    updateBlock(input) {
      return sendJson<Block>("PATCH", "/blocks/update", input);
    },
    updatePage(input) {
      return sendJson<Page>("PATCH", "/pages/update", input);
    }
  };
}

function toSearchParams(input: { limit?: number; query: string }) {
  const params: Record<string, string> = { query: input.query };

  if (input.limit !== undefined) {
    params.limit = String(input.limit);
  }

  return params;
}
