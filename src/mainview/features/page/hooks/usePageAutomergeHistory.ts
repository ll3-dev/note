import { useEffect, useRef } from "react";
import type { Block, PageDocument } from "../../../../shared/contracts";
import {
  recordBlockTextHistory,
  redoBlockTextHistory,
  syncPageAutomergeHistory,
  undoBlockTextHistory,
  type PageAutomergeHistoryState
} from "../lib/pageAutomergeHistory";

export function usePageAutomergeHistory(document: PageDocument) {
  const stateRef = useRef<PageAutomergeHistoryState | null>(null);

  useEffect(() => {
    stateRef.current = syncPageAutomergeHistory(stateRef.current, document);
  }, [document]);

  function recordBlockText(block: Block, text: string) {
    stateRef.current = recordBlockTextHistory(
      syncPageAutomergeHistory(stateRef.current, document),
      block,
      text
    );
  }

  function undoBlockText(blockId: string) {
    const result = undoBlockTextHistory(
      syncPageAutomergeHistory(stateRef.current, document),
      blockId
    );

    stateRef.current = result.state;
    return result.text;
  }

  function redoBlockText(blockId: string) {
    const result = redoBlockTextHistory(
      syncPageAutomergeHistory(stateRef.current, document),
      blockId
    );

    stateRef.current = result.state;
    return result.text;
  }

  return { recordBlockText, redoBlockText, undoBlockText };
}
