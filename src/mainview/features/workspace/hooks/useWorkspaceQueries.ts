import { useQuery, useQueryClient } from "@tanstack/react-query";
import { noteApi } from "@/mainview/lib/rpc";
import { queryKeys } from "@/mainview/lib/queryClient";

export function useWorkspaceQueries(activePageId: string | null) {
  const queryClient = useQueryClient();

  const databaseStatusQuery = useQuery({
    queryKey: queryKeys.databaseStatus,
    queryFn: () => noteApi.getDatabaseStatus()
  });

  const pagesQuery = useQuery({
    queryKey: queryKeys.pages,
    queryFn: () => noteApi.listPages()
  });

  const pageDocumentQuery = useQuery({
    queryKey: queryKeys.pageDocument(activePageId),
    queryFn: () => noteApi.getPageDocument({ pageId: activePageId ?? "" }),
    enabled: Boolean(activePageId)
  });

  async function refreshWorkspace() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
    await queryClient.invalidateQueries({ queryKey: queryKeys.pages });

    if (activePageId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pageDocument(activePageId)
      });
    }
  }

  return {
    databaseStatusQuery,
    pageDocumentQuery,
    pagesQuery,
    refreshWorkspace
  };
}
