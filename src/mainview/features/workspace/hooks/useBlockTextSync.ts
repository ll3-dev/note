import { useCallback, useEffect, useRef } from "react";
import type { Block } from "../../../../shared/contracts";

const TEXT_SYNC_DEBOUNCE_MS = 700;

type PendingTextSave = {
  block: Block;
  text: string;
  timer: ReturnType<typeof setTimeout> | null;
};

type UseBlockTextSyncOptions = {
  saveText: (block: Block, text: string) => Promise<void>;
};

export function useBlockTextSync({ saveText }: UseBlockTextSyncOptions) {
  const pendingSavesRef = useRef(new Map<string, PendingTextSave>());

  const clearPendingText = useCallback((blockId: string) => {
    const pending = pendingSavesRef.current.get(blockId);

    if (pending?.timer) {
      clearTimeout(pending.timer);
    }

    pendingSavesRef.current.delete(blockId);
  }, []);

  const flushTextDraft = useCallback(
    async (block: Block, text: string) => {
      clearPendingText(block.id);

      if (text === block.text) {
        return;
      }

      await saveText(block, text);
    },
    [clearPendingText, saveText]
  );

  const flushQueuedTextDraft = useCallback(
    async (blockId: string) => {
      const pending = pendingSavesRef.current.get(blockId);

      if (!pending) {
        return;
      }

      await flushTextDraft(pending.block, pending.text);
    },
    [flushTextDraft]
  );

  const flushAllTextDrafts = useCallback(async () => {
    const pendingSaves = Array.from(pendingSavesRef.current.values());
    pendingSavesRef.current.clear();

    for (const pending of pendingSaves) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }

      if (pending.text !== pending.block.text) {
        await saveText(pending.block, pending.text);
      }
    }
  }, [saveText]);

  const queueTextDraft = useCallback(
    (block: Block, text: string) => {
      clearPendingText(block.id);

      if (text === block.text) {
        return;
      }

      const timer = setTimeout(() => {
        void flushTextDraft(block, text);
      }, TEXT_SYNC_DEBOUNCE_MS);

      pendingSavesRef.current.set(block.id, { block, text, timer });
    },
    [clearPendingText, flushTextDraft]
  );

  useEffect(
    () => () => {
      void flushAllTextDrafts();
    },
    [flushAllTextDrafts]
  );

  return {
    clearPendingText,
    flushAllTextDrafts,
    flushQueuedTextDraft,
    flushTextDraft,
    queueTextDraft
  };
}
