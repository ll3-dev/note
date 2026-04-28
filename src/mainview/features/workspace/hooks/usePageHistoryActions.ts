import type { Block } from "../../../../shared/contracts";
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
    return applyPageHistory(block, "undo");
  }

  async function redoBlockText(block: Block) {
    return applyPageHistory(block, "redo");
  }

  async function applyPageHistory(block: Block, direction: "redo" | "undo") {
    clearPendingText(block.id);
    const restored =
      direction === "undo"
        ? await noteApi.undoPageHistory({ pageId: block.pageId })
        : await noteApi.redoPageHistory({ pageId: block.pageId });

    refetchDocument();
    return restored?.blocks.find((item) => item.id === block.id)?.text ?? null;
  }

  return { redoBlockText, undoBlockText };
}
