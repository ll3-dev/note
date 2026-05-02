import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteApi } from "@/mainview/lib/rpc";
import { queryKeys } from "@/mainview/lib/queryClient";
import type {
  Block,
  BlockProps,
  BlockType,
  CreateBlockInput,
  Page,
  PageDocument
} from "@/shared/contracts";
import {
  getBlocksAfterMove,
  moveBlocksSequentially
} from "@/mainview/features/page/lib/blockDrag";
import {
  getBlockMutationSyncState,
  shouldApplyBlockMutationResponse
} from "@/mainview/features/workspace/lib/blockMutationSyncMachine";

type UseWorkspaceMutationsOptions = {
  navigateToPage: (pageId: string) => Promise<void>;
  onPageCreated: (page: Page) => void;
  onPageUpdated: (page: Page) => void;
};

export function useWorkspaceMutations({
  navigateToPage,
  onPageCreated,
  onPageUpdated
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

  async function createBlocks(inputs: CreateBlockInput[]) {
    const pageId = inputs[0]?.pageId;

    if (!pageId || inputs.length === 0) {
      return [];
    }

    const createdBlocks = await noteApi.createBlocks({ blocks: inputs });
    await invalidateDocument(queryClient, pageId);
    await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });

    return createdBlocks;
  }

  async function deleteBlocks(
    blocks: Block[],
    fallbackBlock?: {
      pageId: string;
      props?: BlockProps;
      text?: string;
      type?: BlockType;
    }
  ) {
    const pageId = blocks[0]?.pageId;

    if (!pageId || blocks.length === 0) {
      return { deleted: true as const };
    }

    const result = await noteApi.deleteBlocks({
      blockIds: blocks.map((block) => block.id),
      fallbackBlock
    });

    await invalidateDocument(queryClient, pageId);
    await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });

    return result;
  }

  async function deletePage(page: Page) {
    await noteApi.deletePage({ pageId: page.id });
    queryClient.removeQueries({ queryKey: queryKeys.pageDocument(page.id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
    await queryClient.invalidateQueries({ queryKey: queryKeys.archivedPages });
    await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
    await queryClient.invalidateQueries({ queryKey: queryKeys.backlinksRoot });
  }

  async function restorePage(pageId: string) {
    await noteApi.restorePage({ pageId });
    await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
    await queryClient.invalidateQueries({ queryKey: queryKeys.archivedPages });
    await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
    await queryClient.invalidateQueries({ queryKey: queryKeys.backlinksRoot });
    await queryClient.invalidateQueries({ queryKey: queryKeys.pageDocument(pageId) });
  }

  async function createLinkedPage(title: string, parentPageId: string) {
    const document = await noteApi.createPage({ title, parentPageId });

    queryClient.setQueryData(queryKeys.pageDocument(document.page.id), document);
    await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
    await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });

    return document.page;
  }

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
      updateBlockInCache(queryClient, block.pageId, block.id, (item) => ({
        ...item,
        ...definedValues(changes)
      }));
    },
    onSuccess: async (block, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      await queryClient.invalidateQueries({ queryKey: queryKeys.backlinksRoot });
      const syncState = getBlockMutationSyncState(
        getCachedBlock(queryClient, block.pageId, block.id),
        variables
      );

      if (!shouldApplyBlockMutationResponse(syncState)) {
        return;
      }

      updateBlockInCache(queryClient, block.pageId, block.id, () => block);
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (block: Block) => noteApi.deleteBlock({ blockId: block.id }),
    onSuccess: async (_result, block) => {
      await invalidateDocument(queryClient, block.pageId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.databaseStatus });
    }
  });

  const updatePageMutation = useMutation({
    scope: { id: "update-page-title" },
    mutationFn: ({ page, title }: { page: Page; title: string }) =>
      noteApi.updatePage({
        pageId: page.id,
        title
      }),
    onMutate: async ({ page, title }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pages });
      await queryClient.cancelQueries({
        queryKey: queryKeys.pageDocument(page.id)
      });

      const updatedPage = { ...page, title };

      updatePageInCache(queryClient, updatedPage);
      onPageUpdated(updatedPage);
    },
    onSuccess: async (page, variables) => {
      if (getCachedPageTitle(queryClient, page.id) !== variables.title) {
        return;
      }

      updatePageInCache(queryClient, page);
      onPageUpdated(page);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      await queryClient.invalidateQueries({ queryKey: ["pageDocument"] });
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

  async function moveBlocks({
    afterBlockId,
    blocks
  }: {
    afterBlockId: string | null;
    blocks: Block[];
  }) {
    const pageId = blocks[0]?.pageId;

    if (!pageId) {
      return;
    }

    const movingBlockIds = blocks.map((block) => block.id);

    await queryClient.cancelQueries({ queryKey: queryKeys.pageDocument(pageId) });
    queryClient.setQueryData<PageDocument>(
      queryKeys.pageDocument(pageId),
      (document) =>
        document
          ? {
              ...document,
              blocks: getBlocksAfterMove(
                document.blocks,
                movingBlockIds,
                afterBlockId
              )
            }
          : document
    );

    await moveBlocksSequentially(blocks, afterBlockId, async (block, nextAfterBlockId) => {
      await noteApi.moveBlock({
        afterBlockId: nextAfterBlockId,
        blockId: block.id
      });
    });
    await invalidateDocument(queryClient, pageId);
  }

  const movePageMutation = useMutation({
    mutationFn: ({
      afterPageId,
      page,
      parentPageId
    }: {
      afterPageId?: string | null;
      page: Page;
      parentPageId?: string | null;
    }) =>
      noteApi.movePage({
        afterPageId: afterPageId ?? null,
        pageId: page.id,
        parentPageId: parentPageId ?? null
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
    }
  });

  return {
    createBlockMutation,
    createBlocks,
    deletePage,
    deleteBlocks,
    createLinkedPage,
    createPageMutation,
    deleteBlockMutation,
    moveBlockMutation,
    moveBlocks,
    movePageMutation,
    updatePageMutation,
    restorePage,
    updateBlockMutation
  };
}

async function invalidateDocument(client: QueryClient, pageId: string) {
  await client.invalidateQueries({ queryKey: queryKeys.pageDocument(pageId) });
  await client.invalidateQueries({ queryKey: queryKeys.pages });
}

function updateBlockInCache(
  client: QueryClient,
  pageId: string,
  blockId: string,
  update: (block: Block) => Block
) {
  client.setQueryData<PageDocument>(queryKeys.pageDocument(pageId), (document) => {
    if (!document) {
      return document;
    }

    return {
      ...document,
      blocks: document.blocks.map((block) =>
        block.id === blockId ? update(block) : block
      )
    };
  });
}

function updatePageInCache(client: QueryClient, page: Page) {
  client.setQueryData<PageDocument>(queryKeys.pageDocument(page.id), (document) =>
    document ? { ...document, page } : document
  );
  client.setQueryData<Page[]>(queryKeys.pages, (pages) =>
    pages?.map((item) => (item.id === page.id ? page : item))
  );
}

function getCachedPageTitle(client: QueryClient, pageId: string) {
  return client.getQueryData<PageDocument>(queryKeys.pageDocument(pageId))?.page
    .title;
}

function getCachedBlock(client: QueryClient, pageId: string, blockId: string) {
  return client
    .getQueryData<PageDocument>(queryKeys.pageDocument(pageId))
    ?.blocks.find((block) => block.id === blockId) ?? null;
}

function definedValues<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
