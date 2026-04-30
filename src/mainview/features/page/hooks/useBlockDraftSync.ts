import { useEffect, useRef } from "react";
import type { Block, BlockProps } from "@/shared/contracts";
import {
  getDraftSyncState,
  shouldAdoptIncomingServerDraft
} from "@/mainview/features/page/lib/blockDraftSyncMachine";

type UseBlockDraftSyncOptions = {
  block: Block;
  draft: string;
  draftProps: BlockProps;
  setDraft: (draft: string) => void;
  setDraftProps: (props: BlockProps) => void;
  syncEditableText: (text: string) => void;
};

export function useBlockDraftSync({
  block,
  draft,
  draftProps,
  setDraft,
  setDraftProps,
  syncEditableText
}: UseBlockDraftSyncOptions) {
  const serverBlockRef = useRef(block);

  useEffect(() => {
    const previousServerBlock = serverBlockRef.current;
    const syncState = getDraftSyncState(previousServerBlock, block, {
      props: draftProps,
      text: draft
    });

    serverBlockRef.current = block;

    if (shouldAdoptIncomingServerDraft(syncState)) {
      setDraft(block.text);
      setDraftProps(block.props);
      syncEditableText(block.text);
    }
  }, [block, draft, draftProps, setDraft, setDraftProps, syncEditableText]);
}
