import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteApi } from "@/mainview/lib/rpc";
import { queryKeys } from "@/mainview/lib/queryClient";
import type { Block } from "../../../../shared/contracts";

type UseWorkspaceMutationsOptions = {
  navigateToPage: (pageId: string) => Promise<void>;
  onPageCreated: (pageId: string) => void;
};

export function useWorkspaceMutations({
  navigateToPage,
  onPageCreated
}: UseWorkspaceMutationsOptions) {
  const queryClient = useQueryClient();

  const createPageMutation = useMutation({
    mutationFn: (title: string) =>
      noteApi.createPage({
        title,
        parentPageId: null
      }),
    onSuccess: async (document) => {
      onPageCreated(document.page.id);
      queryClient.setQueryData(
        queryKeys.pageDocument(document.page.id),
        document
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
      await navigateToPage(document.page.id);
    }
  });

  const createBlockMutation = useMutation({
    mutationFn: (pageId: string) =>
      noteApi.createBlock({
        pageId,
        type: "paragraph",
        text: "",
        props: {}
      }),
    onSuccess: async (_block, pageId) => {
      await invalidateDocument(queryClient, pageId);
    }
  });

  const updateBlockMutation = useMutation({
    mutationFn: ({ block, text }: { block: Block; text: string }) =>
      noteApi.updateBlock({
        blockId: block.id,
        text
      }),
    onSuccess: async (block) => {
      await invalidateDocument(queryClient, block.pageId);
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (block: Block) => noteApi.deleteBlock({ blockId: block.id }),
    onSuccess: async (_result, block) => {
      await invalidateDocument(queryClient, block.pageId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
    }
  });

  return {
    createBlockMutation,
    createPageMutation,
    deleteBlockMutation,
    updateBlockMutation
  };
}

async function invalidateDocument(client: QueryClient, pageId: string) {
  await client.invalidateQueries({ queryKey: queryKeys.pageDocument(pageId) });
  await client.invalidateQueries({ queryKey: queryKeys.pages });
}
