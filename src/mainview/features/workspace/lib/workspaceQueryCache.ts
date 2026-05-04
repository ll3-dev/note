import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/mainview/lib/queryClient";
import type { Block, Page, PageDocument } from "@/shared/contracts";

export async function invalidatePageDocument(
  client: QueryClient,
  pageId: string
) {
  await client.invalidateQueries({ queryKey: queryKeys.pageDocument(pageId) });
  await client.invalidateQueries({ queryKey: queryKeys.pages });
}

export function updateBlockInCache(
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

export function updatePageInCache(client: QueryClient, page: Page) {
  client.setQueryData<PageDocument>(queryKeys.pageDocument(page.id), (document) =>
    document ? { ...document, page } : document
  );
  client.setQueryData<Page[]>(queryKeys.pages, (pages) =>
    pages?.map((item) => (item.id === page.id ? page : item))
  );
}

export function getCachedPageTitle(client: QueryClient, pageId: string) {
  return client.getQueryData<PageDocument>(queryKeys.pageDocument(pageId))?.page
    .title;
}

export function getCachedBlock(
  client: QueryClient,
  pageId: string,
  blockId: string
) {
  return client
    .getQueryData<PageDocument>(queryKeys.pageDocument(pageId))
    ?.blocks.find((block) => block.id === blockId) ?? null;
}

export function definedValues<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
