import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const queryKeys = {
  databaseStatus: ["databaseStatus"] as const,
  backlinksRoot: ["backlinks"] as const,
  backlinks: (pageId: string | null) => ["backlinks", pageId] as const,
  pages: ["pages"] as const,
  pageDocument: (pageId: string | null) => ["pageDocument", pageId] as const,
  workspaceSearch: (query: string) => ["workspaceSearch", query] as const
};
