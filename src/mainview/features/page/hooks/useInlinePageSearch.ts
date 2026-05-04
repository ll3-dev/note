import { useState, useCallback } from "react";
import {
  getInlinePageSearchTrigger,
  type InlinePageSearchTriggerChar
} from "@/mainview/features/page/lib/inlinePageSearchTrigger";

export type PageSearchTriggerState = {
  active: boolean;
  query: string;
  triggerChar: InlinePageSearchTriggerChar;
  triggerOffset: number;
};

export function useInlinePageSearch() {
  const [triggerState, setTriggerState] = useState<PageSearchTriggerState | null>(null);

  const checkTrigger = useCallback((text: string, cursorOffset: number) => {
    const triggerMatch = getInlinePageSearchTrigger(text, cursorOffset);
    if (triggerMatch) {
      const nextState = {
        active: true,
        ...triggerMatch
      } as const;

      setTriggerState(nextState);
      return nextState;
    }

    setTriggerState(null);
    return null;
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
