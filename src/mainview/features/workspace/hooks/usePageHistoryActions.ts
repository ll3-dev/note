import type { Block } from "@/shared/contracts";
import { noteApi } from "@/mainview/lib/rpc";

type UsePageHistoryActionsInput = {
  clearPendingText: (blockId: string) => void;
  refetchDocument: () => void;
};

export function usePageHistoryActions({
  clearPendingText,
  refetchDocument
}: UsePageHistoryActionsInput) {
  async function undoBlockText(block: Block) {
    clearPendingText(block.id);
    const restored = await applyPageHistory(block.pageId, "undo");

    return restored?.blocks.find((item) => item.id === block.id) ?? null;
  }

  async function redoBlockText(block: Block) {
    clearPendingText(block.id);
    const restored = await applyPageHistory(block.pageId, "redo");

    return restored?.blocks.find((item) => item.id === block.id) ?? null;
  }

  async function undoPage(pageId: string) {
    return applyPageHistory(pageId, "undo");
  }

  async function redoPage(pageId: string) {
    return applyPageHistory(pageId, "redo");
  }

  async function applyPageHistory(pageId: string, direction: "redo" | "undo") {
    const restored =
      direction === "undo"
        ? await noteApi.undoPageHistory({ pageId })
        : await noteApi.redoPageHistory({ pageId });

    refetchDocument();
    return restored;
  }

  return { redoBlockText, redoPage, undoBlockText, undoPage };
}
