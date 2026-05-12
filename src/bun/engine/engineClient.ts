import type {
  Backlink,
  DatabaseStatus,
  GetPageDocumentInput,
  ListBacklinksInput,
  Page,
  PageDocument,
  PageSearchResult,
  SearchPagesInput,
  SearchWorkspaceInput,
  SearchWorkspaceResult
} from "@/shared/contracts";

export type EngineClient = {
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  getPageDocument: (input: GetPageDocumentInput) => Promise<PageDocument>;
  listBacklinks: (input: ListBacklinksInput) => Promise<Backlink[]>;
  listArchivedPages: () => Promise<Page[]>;
  listPages: () => Promise<Page[]>;
  searchPages: (input: SearchPagesInput) => Promise<PageSearchResult[]>;
  searchWorkspace: (
    input: SearchWorkspaceInput
  ) => Promise<SearchWorkspaceResult[]>;
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

  return {
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
    searchPages(input) {
      return getJson<PageSearchResult[]>(
        `/search/pages?${new URLSearchParams(toSearchParams(input))}`
      );
    },
    searchWorkspace(input) {
      return getJson<SearchWorkspaceResult[]>(
        `/search/workspace?${new URLSearchParams(toSearchParams(input))}`
      );
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
