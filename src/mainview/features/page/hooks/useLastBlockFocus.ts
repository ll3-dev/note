import type { MouseEvent } from "react";
import type { PageDocument } from "../../../../shared/contracts";
import type { CreateBlockDraft } from "../lib/blockEditingBehavior";
import { placeCursorAtEnd } from "../lib/domSelection";

type UseLastBlockFocusOptions = {
  document: PageDocument;
  onCreateBlockAfter: (
    block: PageDocument["blocks"][number],
    draft?: CreateBlockDraft
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

    const lastBlock = document.blocks.at(-1);

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
