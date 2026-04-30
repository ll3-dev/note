import type {
  Block,
  BlockProps,
  BlockType
} from "@/shared/contracts";
import { areBlockPropsEqual } from "@/shared/blockProps";

export type BlockMutationDraft = {
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

export type BlockMutationSyncState =
  | "missing-cache"
  | "optimistic-current"
  | "cache-ahead";

export function getBlockMutationSyncState(
  cachedBlock: Block | null,
  submitted: BlockMutationDraft
): BlockMutationSyncState {
  if (!cachedBlock) {
    return "missing-cache";
  }

  if (submitted.text !== undefined && cachedBlock.text !== submitted.text) {
    return "cache-ahead";
  }

  if (submitted.type !== undefined && cachedBlock.type !== submitted.type) {
    return "cache-ahead";
  }

  if (
    submitted.props !== undefined &&
    !areBlockPropsEqual(cachedBlock.props, submitted.props)
  ) {
    return "cache-ahead";
  }

  return "optimistic-current";
}

export function shouldApplyBlockMutationResponse(
  state: BlockMutationSyncState
) {
  return state === "optimistic-current";
}
