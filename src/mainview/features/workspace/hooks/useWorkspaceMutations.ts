import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteApi } from "@/mainview/lib/rpc";
import { queryKeys } from "@/mainview/lib/queryClient";
import type {
  Block,
  BlockProps,
  BlockType,
  PageDocument,
  Page
} from "../../../../shared/contracts";

type UseWorkspaceMutationsOptions = {
  navigateToPage: (pageId: string) => Promise<void>;
  onPageCreated: (page: Page) => void;
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
      onPageCreated(document.page);
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
    mutationFn: (input: {
      pageId: string;
      afterBlockId?: string | null;
      type?: BlockType;
      text?: string;
      props?: BlockProps;
    }) =>
      noteApi.createBlock({
        pageId: input.pageId,
        afterBlockId: input.afterBlockId ?? null,
        type: input.type ?? "paragraph",
        text: input.text ?? "",
        props: input.props ?? {}
      }),
    onSuccess: async (block) => {
      await invalidateDocument(queryClient, block.pageId);
    }
  });

  const updateBlockMutation = useMutation({
    mutationFn: ({
      block,
      props,
      text,
      type
    }: {
      block: Block;
      props?: BlockProps;
      text?: string;
      type?: BlockType;
    }) =>
      noteApi.updateBlock({
        blockId: block.id,
        props,
        text,
        type
      }),
    onMutate: async ({ block, props, text, type }) => {
      const changes = { props, text, type };

      queryClient.setQueryData<PageDocument>(
        queryKeys.pageDocument(block.pageId),
        (document) => {
          if (!document) {
            return document;
          }

          return {
            ...document,
            blocks: document.blocks.map((item) =>
              item.id === block.id ? { ...item, ...definedValues(changes) } : item
            )
          };
        }
      );
    },
    onSuccess: async (block) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      queryClient.setQueryData<PageDocument>(
        queryKeys.pageDocument(block.pageId),
        (document) => {
          if (!document) {
            return document;
          }

          return {
            ...document,
            blocks: document.blocks.map((item) =>
              item.id === block.id ? block : item
            )
          };
        }
      );
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (block: Block) => noteApi.deleteBlock({ blockId: block.id }),
    onSuccess: async (_result, block) => {
      await invalidateDocument(queryClient, block.pageId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
    }
  });

  const moveBlockMutation = useMutation({
    mutationFn: ({
      afterBlockId,
      block
    }: {
      afterBlockId?: string | null;
      block: Block;
    }) =>
      noteApi.moveBlock({
        afterBlockId: afterBlockId ?? null,
        blockId: block.id
      }),
    onSuccess: async (block) => {
      await invalidateDocument(queryClient, block.pageId);
    }
  });

  return {
    createBlockMutation,
    createPageMutation,
    deleteBlockMutation,
    moveBlockMutation,
    updateBlockMutation
  };
}

async function invalidateDocument(client: QueryClient, pageId: string) {
  await client.invalidateQueries({ queryKey: queryKeys.pageDocument(pageId) });
  await client.invalidateQueries({ queryKey: queryKeys.pages });
}

function definedValues<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
