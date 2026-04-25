import { useNavigate } from "@tanstack/react-router";
import {
  FileText,
  PanelLeft,
  Plus,
  RefreshCw
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import { BlockEditor } from "./BlockEditor";
import { EmptyEditorState } from "./EmptyEditorState";
import { StatusFooter } from "./StatusFooter";
import { useWorkspaceMutations } from "./hooks/useWorkspaceMutations";
import { useWorkspaceQueries } from "./hooks/useWorkspaceQueries";

type WorkspaceScreenProps = {
  routePageId: string | null;
};

export function WorkspaceScreen({ routePageId }: WorkspaceScreenProps) {
  const navigate = useNavigate();
  const selectedPageId = useWorkspaceStore((state) => state.selectedPageId);
  const setSelectedPageId = useWorkspaceStore((state) => state.setSelectedPageId);
  const [pageTitle, setPageTitle] = useState("");
  const activePageId = routePageId ?? selectedPageId;
  const {
    databaseStatusQuery,
    pageDocumentQuery,
    pagesQuery,
    refreshWorkspace
  } = useWorkspaceQueries(activePageId);

  const {
    createBlockMutation,
    createPageMutation,
    deleteBlockMutation,
    updateBlockMutation
  } = useWorkspaceMutations({
    navigateToPage: async (pageId) => {
      await navigateToPage(navigate, pageId);
    },
    onPageCreated: (pageId) => {
      setSelectedPageId(pageId);
      setPageTitle("");
    }
  });

  const pages = pagesQuery.data ?? [];
  const selectedDocument = pageDocumentQuery.data ?? null;

  useEffect(() => {
    if (routePageId) {
      setSelectedPageId(routePageId);
    }
  }, [routePageId, setSelectedPageId]);

  useEffect(() => {
    if (!activePageId && pages[0]) {
      setSelectedPageId(pages[0].id);
      void navigateToPage(navigate, pages[0].id, true);
    }
  }, [activePageId, navigate, pages, setSelectedPageId]);

  function handleCreatePage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = pageTitle.trim();

    if (title) {
      createPageMutation.mutate(title);
    }
  }

  function selectPage(pageId: string) {
    setSelectedPageId(pageId);
    void navigateToPage(navigate, pageId);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen min-h-[640px]">
        <aside className="flex w-[272px] shrink-0 flex-col border-r border-border bg-sidebar">
          <header className="flex h-14 items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md border border-border bg-background">
                <PanelLeft className="size-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold">Note</span>
            </div>
            <Button
              aria-label="새로고침"
              onClick={() => void refreshWorkspace()}
              size="icon-sm"
              variant="ghost"
            >
              <RefreshCw className="size-4" />
            </Button>
          </header>

          <form className="px-3 pb-3" onSubmit={handleCreatePage}>
            <div className="flex gap-2">
              <Input
                aria-label="새 페이지 제목"
                className="h-8 bg-background text-sm"
                onChange={(event) => setPageTitle(event.target.value)}
                placeholder="New page"
                value={pageTitle}
              />
              <Button
                disabled={createPageMutation.isPending || !pageTitle.trim()}
                size="icon-sm"
                type="submit"
                variant="outline"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </form>

          <Separator />

          <ScrollArea className="min-h-0 flex-1">
            <nav className="grid gap-1 p-2">
              {pages.length === 0 ? (
                <p className="px-2 py-6 text-sm text-muted-foreground">
                  Create your first page.
                </p>
              ) : null}
              {pages.map((page) => (
                <Button
                  className="h-8 justify-start px-2 text-left font-normal"
                  key={page.id}
                  onClick={() => selectPage(page.id)}
                  variant={page.id === activePageId ? "secondary" : "ghost"}
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate">{page.title}</span>
                </Button>
              ))}
            </nav>
          </ScrollArea>

          <StatusFooter
            blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
            pagesCount={databaseStatusQuery.data?.pagesCount ?? 0}
            sqliteVersion={databaseStatusQuery.data?.sqliteVersion}
          />
        </aside>

        <section className="min-w-0 flex-1 bg-background">
          <div className="mx-auto flex h-full w-full max-w-[920px] flex-col px-10 py-8">
            {selectedDocument ? (
              <>
                <header className="mb-7">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <Badge variant="outline">
                      {selectedDocument.blocks.length} blocks
                    </Badge>
                    <Button
                      disabled={!activePageId || createBlockMutation.isPending}
                      onClick={() =>
                        activePageId
                          ? createBlockMutation.mutate(activePageId)
                          : undefined
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <Plus className="size-4" />
                      Block
                    </Button>
                  </div>
                  <h1 className="text-[40px] font-bold leading-tight tracking-normal">
                    {selectedDocument.page.title}
                  </h1>
                </header>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="grid gap-1 pb-20">
                    {selectedDocument.blocks.map((block) => (
                      <BlockEditor
                        block={block}
                        isDeleting={deleteBlockMutation.isPending}
                        key={block.id}
                        onDelete={(target) => deleteBlockMutation.mutate(target)}
                        onUpdate={(target, text) =>
                          updateBlockMutation.mutate({ block: target, text })
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <EmptyEditorState isLoading={pagesQuery.isLoading} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

async function navigateToPage(
  navigate: ReturnType<typeof useNavigate>,
  pageId: string,
  replace = false
) {
  await navigate({
    to: "/pages/$pageId",
    params: { pageId },
    replace
  });
}
