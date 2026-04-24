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

export type CreatePageInput = {
  title: string;
  parentPageId?: string | null;
};

export type NoteRPC = {
  bun: RPCSchema<{
    requests: {
      getDatabaseStatus: {
        params: void;
        response: DatabaseStatus;
      };
      createPage: {
        params: CreatePageInput;
        response: Page;
      };
    };
  }>;
  webview: RPCSchema;
};
