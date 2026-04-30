import type { Page } from "@/shared/contracts";
import {
  getPagesById,
  getPagesForParent,
  groupPagesByParent
} from "@/mainview/features/workspace/lib/pageTree";
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
  const pagesById = getPagesById(pages);

  if (pages.length === 0) {
    return (
      <p className="px-2 py-6 text-sm text-muted-foreground">
        Create your first page.
      </p>
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-0.5">
      <SidebarPageTreeItems
        activePageId={activePageId}
        depth={0}
        expandedPageIds={expandedPageIds}
        onMovePage={onMovePage}
        onSelectPage={onSelectPage}
        onToggleExpanded={onToggleExpanded}
        pagesById={pagesById}
        pagesByParent={pagesByParent}
        parentPageId={null}
      />
    </div>
  );
}

function SidebarPageTreeItems({
  activePageId,
  depth,
  expandedPageIds,
  onMovePage,
  onSelectPage,
  onToggleExpanded,
  pagesByParent,
  pagesById,
  parentPageId
}: SidebarPageTreeItemsProps) {
  const pages = getPagesForParent(pagesByParent, parentPageId);

  return pages.map((page, index) => {
    const childPages = getPagesForParent(pagesByParent, page.id);
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
        {isExpanded ? (
          <SidebarPageTreeItems
            activePageId={activePageId}
            depth={depth + 1}
            expandedPageIds={expandedPageIds}
            onMovePage={onMovePage}
            onSelectPage={onSelectPage}
            onToggleExpanded={onToggleExpanded}
            pagesById={pagesById}
            pagesByParent={pagesByParent}
            parentPageId={page.id}
          />
        ) : null}
      </div>
    );
  });
}

type SidebarPageTreeItemsProps = {
  activePageId: string | null;
  depth: number;
  expandedPageIds: Set<string>;
  onMovePage: SidebarPageTreeProps["onMovePage"];
  onSelectPage: (page: Page) => void;
  onToggleExpanded: (pageId: string) => void;
  pagesByParent: Map<string, Page[]>;
  pagesById: Map<string, Page>;
  parentPageId: string | null;
};
