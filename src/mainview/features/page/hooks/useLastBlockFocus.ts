import type { MouseEvent } from "react";
import type { PageDocument } from "@/shared/contracts";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";
import { findLastFocusableBlock } from "@/mainview/features/page/lib/blockFocus";
import type { CreateBlockOptions } from "@/mainview/features/page/types/blockEditorTypes";
import { placeCursorAtEnd } from "@/mainview/features/page/web/domSelection";

type UseLastBlockFocusOptions = {
  document: PageDocument;
  onCreateBlockAfter: (
    block: PageDocument["blocks"][number],
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
};

export function useLastBlockFocus({
  document,
  onCreateBlockAfter
}: UseLastBlockFocusOptions) {
  return function focusLastBlock(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) {
      return false;
    }

    if (event.target.closest("[data-block-id]")) {
      return false;
    }

    if (event.target.closest("[contenteditable],button,input,textarea,select,a")) {
      return false;
    }

    const lastBlock = findLastFocusableBlock(document) ?? document.blocks.at(-1);

    if (!lastBlock) {
      return false;
    }

    const editable = window.document.querySelector<HTMLElement>(
      `[data-block-id="${lastBlock.id}"] [contenteditable]`
    );

    if (editable && !shouldCreateBlockAfterBlankClick(lastBlock)) {
      placeCursorAtEnd(editable);
      return true;
    }

    void onCreateBlockAfter(lastBlock, {
      props: {},
      text: "",
      type: "paragraph"
    });
    return true;
  };
}

export function shouldCreateBlockAfterBlankClick(
  block: PageDocument["blocks"][number]
) {
  return block.type === "divider" || block.text.length > 0;
}
