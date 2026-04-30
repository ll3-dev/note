import type { Page } from "@/shared/contracts";

const ROOT_PAGE_PARENT_KEY = "root";

export function getPagesById(pages: Page[]) {
  return new Map(pages.map((page) => [page.id, page]));
}

export function groupPagesByParent(pages: Page[]) {
  const pagesByParent = new Map<string, Page[]>();

  for (const page of pages) {
    const key = page.parentPageId ?? ROOT_PAGE_PARENT_KEY;
    const siblings = pagesByParent.get(key) ?? [];
    siblings.push(page);
    pagesByParent.set(key, siblings);
  }

  return pagesByParent;
}

export function getPagesForParent(
  pagesByParent: Map<string, Page[]>,
  parentPageId: string | null
) {
  return pagesByParent.get(parentPageId ?? ROOT_PAGE_PARENT_KEY) ?? [];
}
