import type {
  Backlink,
  CreatePageInput,
  DatabaseStatus,
  GetPageDocumentInput,
  ListBacklinksInput,
  MovePageInput,
  Page,
  PageDocument,
  PageSearchResult,
  SearchPagesInput,
  SearchWorkspaceInput,
  SearchWorkspaceResult,
  UpdatePageInput
} from "@/shared/contracts";

export type EngineClient = {
  createPage: (input: CreatePageInput) => Promise<PageDocument>;
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  getPageDocument: (input: GetPageDocumentInput) => Promise<PageDocument>;
  listBacklinks: (input: ListBacklinksInput) => Promise<Backlink[]>;
  listArchivedPages: () => Promise<Page[]>;
  listPages: () => Promise<Page[]>;
  movePage: (input: MovePageInput) => Promise<Page>;
  searchPages: (input: SearchPagesInput) => Promise<PageSearchResult[]>;
  searchWorkspace: (
    input: SearchWorkspaceInput
  ) => Promise<SearchWorkspaceResult[]>;
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
    createPage(input) {
      return sendJson<PageDocument>("POST", "/pages", input);
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
    movePage(input) {
      return sendJson<Page>("POST", "/pages/move", input);
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
