import type { MouseEvent } from "react";
import type { PageDocument } from "../../../../shared/contracts";
import { placeCursorAtEnd } from "../lib/domSelection";

export function useLastBlockFocus(document: PageDocument) {
  return function focusLastBlock(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest("[data-block-id]")) {
      return;
    }

    const lastBlock = document.blocks.at(-1);

    if (!lastBlock) {
      return;
    }

    const editable = window.document.querySelector<HTMLElement>(
      `[data-block-id="${lastBlock.id}"] [contenteditable]`
    );

    if (editable) {
      placeCursorAtEnd(editable);
    }
  };
}
