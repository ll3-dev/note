import { useLayoutEffect, useRef } from "react";
import type { Block, BlockProps, BlockType } from "@/shared/contracts";
import {
  getDraftSyncState,
  shouldAdoptIncomingServerDraft
} from "@/mainview/features/page/lib/blockDraftSyncMachine";

type UseBlockDraftSyncOptions = {
  block: Block;
  draft: string;
  draftProps: BlockProps;
  draftType: BlockType;
  setDraft: (draft: string) => void;
  setDraftProps: (props: BlockProps) => void;
  setDraftType: (type: BlockType) => void;
  syncEditableText: (text: string) => void;
};

export function useBlockDraftSync({
  block,
  draft,
  draftProps,
  draftType,
  setDraft,
  setDraftProps,
  setDraftType,
  syncEditableText
}: UseBlockDraftSyncOptions) {
  const serverBlockRef = useRef(block);

  useLayoutEffect(() => {
    const previousServerBlock = serverBlockRef.current;
    const syncState = getDraftSyncState(previousServerBlock, block, {
      props: draftProps,
      text: draft,
      type: draftType
    });

    serverBlockRef.current = block;

    if (shouldAdoptIncomingServerDraft(syncState)) {
      setDraft(block.text);
      setDraftProps(block.props);
      setDraftType(block.type);
      syncEditableText(block.text);
    }
  }, [
    block,
    draft,
    draftProps,
    draftType,
    setDraft,
    setDraftProps,
    setDraftType,
    syncEditableText
  ]);
}
