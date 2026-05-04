import { useEffect, useState } from "react";
import type { PageDocument } from "@/shared/contracts";
import { placeCursorAtEnd, placeCursorAtStart } from "@/mainview/features/page/web/domSelection";
import { getBlockFocusTarget } from "@/mainview/features/page/web/blockFocusDom";

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

    const target = getBlockFocusTarget(focusTarget.blockId);

    if (target?.isContentEditable) {
      if (focusTarget.placement === "start") {
        placeCursorAtStart(target);
      } else {
        placeCursorAtEnd(target);
      }
      setFocusTarget(null);
      return;
    }

    if (target) {
      target.focus();
      setFocusTarget(null);
    }
  }, [document, focusTarget]);

  function setFocusBlockId(blockId: string, placement: FocusPlacement = "end") {
    setFocusTarget({ blockId, placement });
  }

  return { setFocusBlockId };
}
