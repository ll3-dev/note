import type {
  DatabaseStatus,
  GetPageDocumentInput,
  Page,
  PageDocument
} from "@/shared/contracts";

export type EngineClient = {
  getDatabaseStatus: () => Promise<DatabaseStatus>;
  getPageDocument: (input: GetPageDocumentInput) => Promise<PageDocument>;
  listArchivedPages: () => Promise<Page[]>;
  listPages: () => Promise<Page[]>;
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
    listArchivedPages() {
      return getJson<Page[]>("/pages/archived");
    },
    listPages() {
      return getJson<Page[]>("/pages");
    }
  };
}
