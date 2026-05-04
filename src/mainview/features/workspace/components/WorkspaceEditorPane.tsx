import type { ComponentProps } from "react";
import type { Backlink, PageDocument } from "@/shared/contracts";
import { PageEditor } from "@/mainview/features/page/components/PageEditor";
import { EmptyEditorState } from "./EmptyEditorState";
import { WorkspaceHome } from "./WorkspaceHome";
import { getPageTitleDisplay } from "@/shared/pageDisplay";

export type WorkspacePageEditorManager = Omit<
  ComponentProps<typeof PageEditor>,
  "document" | "pages"
>;

type WorkspaceEditorPaneProps = {
  document: PageDocument | null;
  isLoading: boolean;
  backlinks: Backlink[];
  editorPages: PageDocument["page"][];
  isCreatingPage: boolean;
  onCreateUntitledPage: () => void;
  onOpenQuickSwitcher: () => void;
  onRestorePageLink?: (pageId: string) => void;
  onSelectPage: (page: PageDocument["page"]) => void;
  pageEditorManager: WorkspacePageEditorManager;
  pages: PageDocument["page"][];
};

export function WorkspaceEditorPane({
  document,
  isLoading,
  backlinks,
  editorPages,
  isCreatingPage,
  onCreateUntitledPage,
  onOpenQuickSwitcher,
  onSelectPage,
  pageEditorManager,
  pages
}: WorkspaceEditorPaneProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {document ? (
        <PageEditor
          document={document}
          pages={editorPages}
          {...pageEditorManager}
        />
      ) : !isLoading ? (
        <WorkspaceHome
          isCreatingPage={isCreatingPage}
          onCreateUntitledPage={onCreateUntitledPage}
          onOpenQuickSwitcher={onOpenQuickSwitcher}
          onSelectPage={onSelectPage}
          pages={pages}
        />
      ) : (
        <EmptyEditorState isLoading={isLoading} />
      )}
      {document && backlinks.length > 0 ? (
        <div className="border-t border-border/70 px-12 py-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Backlinks</div>
          <div className="flex flex-wrap gap-2">
            {backlinks.map((backlink) => (
              <button
                className="rounded-sm border border-border/80 px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                key={backlink.blockId}
                onClick={() => pageEditorManager.blockActions.openPageLink(backlink.pageId)}
                type="button"
              >
                {getPageTitleDisplay(backlink.pageTitle)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
