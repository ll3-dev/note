import type { Block, BlockProps } from "../../../../shared/contracts";
import { areBlockPropsEqual } from "./blockProps";

type DraftSnapshot = {
  props: BlockProps;
  text: string;
};

type ServerSnapshot = Pick<Block, "id" | "props" | "text">;

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
    areBlockPropsEqual(draft.props, incomingServer.props)
  ) {
    return "server-caught-up";
  }

  if (
    draft.text === previousServer.text &&
    areBlockPropsEqual(draft.props, previousServer.props)
  ) {
    return "clean";
  }

  return "dirty";
}

export function shouldAdoptIncomingServerDraft(state: DraftSyncState) {
  return state !== "dirty";
}
