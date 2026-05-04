import type { Block, BlockProps, BlockType } from "@/shared/contracts";
import { areBlockPropsEqual } from "./blockProps";

type DraftSnapshot = {
  props: BlockProps;
  text: string;
  type: BlockType;
};

type ServerSnapshot = Pick<Block, "id" | "props" | "text" | "type">;

export type DraftSyncState =
  | "clean"
  | "dirty"
  | "server-caught-up"
  | "block-changed";

export function getDraftSyncState(
  previousServer: ServerSnapshot,
  incomingServer: ServerSnapshot,
  draft: DraftSnapshot
): DraftSyncState {
  if (previousServer.id !== incomingServer.id) {
    return "block-changed";
  }

  if (
    draft.text === incomingServer.text &&
    draft.type === incomingServer.type &&
    areBlockPropsEqual(draft.props, incomingServer.props)
  ) {
    return "server-caught-up";
  }

  if (
    draft.text === previousServer.text &&
    draft.type === previousServer.type &&
    areBlockPropsEqual(draft.props, previousServer.props)
  ) {
    return "clean";
  }

  return "dirty";
}

export function shouldAdoptIncomingServerDraft(state: DraftSyncState) {
  return state !== "dirty";
}
