import type { Page } from "../../../../shared/contracts";
import { SidebarPageItem } from "./SidebarPageItem";

type SidebarPageTreeProps = {
  activePageId: string | null;
  expandedPageIds: Set<string>;
  onMovePage: (
    page: Page,
    parentPageId: string | null,
    afterPageId: string | null
  ) => void;
  onSelectPage: (page: Page) => void;
  onToggleExpanded: (pageId: string) => void;
  pages: Page[];
};

export function SidebarPageTree({
  activePageId,
  expandedPageIds,
  onMovePage,
  onSelectPage,
  onToggleExpanded,
  pages
}: SidebarPageTreeProps) {
  const pagesByParent = groupPagesByParent(pages);
  const pagesById = new Map(pages.map((page) => [page.id, page]));

  if (pages.length === 0) {
    return (
      <p className="px-2 py-6 text-sm text-muted-foreground">
        Create your first page.
      </p>
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-0.5">
      {renderPageItems({
        activePageId,
        expandedPageIds,
        onMovePage,
        onSelectPage,
        onToggleExpanded,
        pagesByParent,
        pagesById,
        parentPageId: null,
        depth: 0
      })}
    </div>
  );
}

function renderPageItems({
  activePageId,
  depth,
  expandedPageIds,
  onMovePage,
  onSelectPage,
  onToggleExpanded,
  pagesByParent,
  pagesById,
  parentPageId
}: {
  activePageId: string | null;
  depth: number;
  expandedPageIds: Set<string>;
  onMovePage: SidebarPageTreeProps["onMovePage"];
  onSelectPage: (page: Page) => void;
  onToggleExpanded: (pageId: string) => void;
  pagesByParent: Map<string, Page[]>;
  pagesById: Map<string, Page>;
  parentPageId: string | null;
}) {
  const pages = pagesByParent.get(parentPageId ?? "root") ?? [];

  return pages.map((page, index) => {
    const childPages = pagesByParent.get(page.id) ?? [];
    const isExpanded = expandedPageIds.has(page.id);
    const previousSibling = pages[index - 1] ?? null;

    return (
      <div key={page.id}>
        <SidebarPageItem
          activePageId={activePageId}
          depth={depth}
          hasChildren={childPages.length > 0}
          isExpanded={isExpanded}
          onMovePage={onMovePage}
          onSelectPage={onSelectPage}
          onToggleExpanded={onToggleExpanded}
          page={page}
          pagesById={pagesById}
          previousSiblingId={previousSibling?.id ?? null}
        />
        {isExpanded
          ? renderPageItems({
              activePageId,
              depth: depth + 1,
              expandedPageIds,
              onMovePage,
              onSelectPage,
              onToggleExpanded,
              pagesByParent,
              pagesById,
              parentPageId: page.id
            })
          : null}
      </div>
    );
  });
}

function groupPagesByParent(pages: Page[]) {
  const pagesByParent = new Map<string, Page[]>();

  for (const page of pages) {
    const key = page.parentPageId ?? "root";
    const siblings = pagesByParent.get(key) ?? [];
    siblings.push(page);
    pagesByParent.set(key, siblings);
  }

  return pagesByParent;
}
