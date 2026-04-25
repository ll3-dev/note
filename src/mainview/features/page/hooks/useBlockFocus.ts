import { useEffect, useState } from "react";
import type { PageDocument } from "../../../../shared/contracts";

export function useBlockFocus(document: PageDocument | null) {
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusBlockId) {
      return;
    }

    const editable = window.document.querySelector<HTMLElement>(
      `[data-block-id="${focusBlockId}"] [contenteditable]`
    );

    if (editable) {
      const range = window.document.createRange();
      const selection = window.getSelection();

      editable.focus();
      range.selectNodeContents(editable);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      setFocusBlockId(null);
    }
  }, [document, focusBlockId]);

  return { setFocusBlockId };
}
