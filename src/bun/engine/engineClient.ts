import type { DatabaseStatus } from "@/shared/contracts";

export type EngineClient = {
  getDatabaseStatus: () => Promise<DatabaseStatus>;
};

export function createEngineClient(baseUrl: string, token: string): EngineClient {
  return {
    async getDatabaseStatus() {
      const response = await fetch(`${baseUrl}/database/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`engine database status failed: ${response.status}`);
      }

      const status = (await response.json()) as {
        sqlite_version: string;
        pages_count: number;
        blocks_count: number;
      };

      return {
        sqliteVersion: status.sqlite_version,
        pagesCount: status.pages_count,
        blocksCount: status.blocks_count
      };
    }
  };
}

