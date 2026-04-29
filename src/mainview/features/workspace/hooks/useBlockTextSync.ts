import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, BlockProps } from "../../../../shared/contracts";
import { areBlockPropsEqual } from "../../page/lib/blockProps";

const TEXT_SYNC_DEBOUNCE_MS = 700;
const SAVED_STATUS_VISIBLE_MS = 1200;

type PendingTextSave = {
  block: Block;
  props?: BlockProps;
  text: string;
  timer: ReturnType<typeof setTimeout> | null;
};

type UseBlockTextSyncOptions = {
  saveText: (block: Block, text: string, props?: BlockProps) => Promise<void>;
};

export type TextSyncStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function useBlockTextSync({ saveText }: UseBlockTextSyncOptions) {
  const pendingSavesRef = useRef(new Map<string, PendingTextSave>());
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<TextSyncStatus>("idle");

  const setSyncStatus = useCallback((nextStatus: TextSyncStatus) => {
    if (savedStatusTimerRef.current) {
      clearTimeout(savedStatusTimerRef.current);
      savedStatusTimerRef.current = null;
    }

    setStatus(nextStatus);

    if (nextStatus === "saved") {
      savedStatusTimerRef.current = setTimeout(() => {
        setStatus("idle");
        savedStatusTimerRef.current = null;
      }, SAVED_STATUS_VISIBLE_MS);
    }
  }, []);

  const clearPendingText = useCallback((blockId: string) => {
    const pending = pendingSavesRef.current.get(blockId);

    if (pending?.timer) {
      clearTimeout(pending.timer);
    }

    pendingSavesRef.current.delete(blockId);

    if (pendingSavesRef.current.size === 0) {
      setSyncStatus("idle");
    }
  }, [setSyncStatus]);

  const flushTextDraft = useCallback(
    async (block: Block, text: string, props?: BlockProps) => {
      clearPendingText(block.id);

      if (text === block.text && areBlockPropsEqual(props, block.props)) {
        return;
      }

      setSyncStatus("saving");

      try {
        await saveText(block, text, props);
        setSyncStatus("saved");
      } catch (error) {
        setSyncStatus("error");
        throw error;
      }
    },
    [clearPendingText, saveText, setSyncStatus]
  );

  const flushQueuedTextDraft = useCallback(
    async (blockId: string) => {
      const pending = pendingSavesRef.current.get(blockId);

      if (!pending) {
        return;
      }

      await flushTextDraft(pending.block, pending.text, pending.props);
    },
    [flushTextDraft]
  );

  const flushAllTextDrafts = useCallback(async () => {
    const pendingSaves = Array.from(pendingSavesRef.current.values());
    pendingSavesRef.current.clear();

    if (pendingSaves.length === 0) {
      return;
    }

    try {
      for (const pending of pendingSaves) {
        if (pending.timer) {
          clearTimeout(pending.timer);
        }

        if (
          pending.text !== pending.block.text ||
          !areBlockPropsEqual(pending.props, pending.block.props)
        ) {
          setSyncStatus("saving");
          await saveText(pending.block, pending.text, pending.props);
        }
      }

      setSyncStatus("saved");
    } catch (error) {
      setSyncStatus("error");
      throw error;
    }
  }, [saveText, setSyncStatus]);

  const queueTextDraft = useCallback(
    (block: Block, text: string, props?: BlockProps) => {
      clearPendingText(block.id);

      if (text === block.text && areBlockPropsEqual(props, block.props)) {
        return;
      }

      const timer = setTimeout(() => {
        void flushTextDraft(block, text, props);
      }, TEXT_SYNC_DEBOUNCE_MS);

      setSyncStatus("pending");
      pendingSavesRef.current.set(block.id, { block, props, text, timer });
    },
    [clearPendingText, flushTextDraft, setSyncStatus]
  );

  useEffect(() => {
    return () => {
      if (savedStatusTimerRef.current) {
        clearTimeout(savedStatusTimerRef.current);
      }

      void flushAllTextDrafts();
    };
  }, [flushAllTextDrafts]);

  return {
    clearPendingText,
    flushAllTextDrafts,
    flushQueuedTextDraft,
    flushTextDraft,
    queueTextDraft,
    status
  };
}
