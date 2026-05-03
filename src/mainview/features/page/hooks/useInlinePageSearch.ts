import { useState, useCallback } from "react";

export type PageSearchTriggerState = {
  active: boolean;
  query: string;
  triggerChar: "@" | "[[";
  triggerOffset: number;
};

export function useInlinePageSearch() {
  const [triggerState, setTriggerState] = useState<PageSearchTriggerState | null>(null);

  const checkTrigger = useCallback((text: string, cursorOffset: number) => {
    const textBeforeCursor = text.slice(0, cursorOffset);

    // Check [[ trigger — match unclosed [[
    const bracketMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);
    if (bracketMatch) {
      const query = bracketMatch[1] ?? "";
      setTriggerState({
        active: true,
        query,
        triggerChar: "[[",
        triggerOffset: cursorOffset - bracketMatch[0].length
      });
      return;
    }

    // Check @ trigger — must be after whitespace or at start of text
    const atMatch = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (atMatch) {
      const query = atMatch[1] ?? "";
      setTriggerState({
        active: true,
        query,
        triggerChar: "@",
        triggerOffset: cursorOffset - atMatch[0].length
      });
      return;
    }

    setTriggerState(null);
  }, []);

  const updateQuery = useCallback((text: string, cursorOffset: number) => {
    // Re-check trigger with current text/cursor to update query as user types
    checkTrigger(text, cursorOffset);
  }, [checkTrigger]);

  const closeSearch = useCallback(() => {
    setTriggerState(null);
  }, []);

  return { checkTrigger, closeSearch, triggerState, updateQuery };
}
