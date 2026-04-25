import { useEffect, useState } from "react";
import type { PageDocument } from "../../../../shared/contracts";

export function useBlockFocus(document: PageDocument | null) {
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusBlockId) {
      return;
    }

    const textarea = window.document.querySelector<HTMLTextAreaElement>(
      `[data-block-id="${focusBlockId}"] textarea`
    );

    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      setFocusBlockId(null);
    }
  }, [document, focusBlockId]);

  return { setFocusBlockId };
}
