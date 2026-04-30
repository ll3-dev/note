import { useEffect, useState } from "react";
import type { PageDocument } from "@/shared/contracts";
import { placeCursorAtEnd, placeCursorAtStart } from "@/mainview/features/page/web/domSelection";

type FocusPlacement = "start" | "end";

type FocusTarget = {
  blockId: string;
  placement: FocusPlacement;
};

export function useBlockFocus(document: PageDocument | null) {
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    const editable = window.document.querySelector<HTMLElement>(
      `[data-block-id="${focusTarget.blockId}"] [contenteditable]`
    );

    if (editable) {
      if (focusTarget.placement === "start") {
        placeCursorAtStart(editable);
      } else {
        placeCursorAtEnd(editable);
      }
      setFocusTarget(null);
    }
  }, [document, focusTarget]);

  function setFocusBlockId(blockId: string, placement: FocusPlacement = "end") {
    setFocusTarget({ blockId, placement });
  }

  return { setFocusBlockId };
}
