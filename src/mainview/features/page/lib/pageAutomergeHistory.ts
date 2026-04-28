import type { Block, PageDocument } from "../../../../shared/contracts";
import {
  changeBlockText,
  createAutomergePageDocument,
  toPageDocument,
  type AutomergePageDocument
} from "../../../../shared/automerge/pageDocument";
import type * as Automerge from "@automerge/automerge";

type PageDoc = Automerge.Doc<AutomergePageDocument>;

export type PageAutomergeHistoryState = {
  current: PageDoc;
  pageId: string;
  redoStack: PageDoc[];
  undoStack: PageDoc[];
};

export function createPageAutomergeHistory(
  document: PageDocument
): PageAutomergeHistoryState {
  return {
    current: createAutomergePageDocument(document),
    pageId: document.page.id,
    redoStack: [],
    undoStack: []
  } satisfies PageAutomergeHistoryState;
}

export function syncPageAutomergeHistory(
  state: PageAutomergeHistoryState | null,
  document: PageDocument
) {
  if (!state || state.pageId !== document.page.id) {
    return createPageAutomergeHistory(document);
  }

  return state;
}

export function recordBlockTextHistory(
  state: PageAutomergeHistoryState,
  block: Block,
  text: string
) {
  const currentBlock = toPageDocument(state.current).blocks.find(
    (item) => item.id === block.id
  );

  if (!currentBlock || currentBlock.text === text) {
    return state;
  }

  return {
    ...state,
    current: changeBlockText(state.current, block.id, text),
    redoStack: [],
    undoStack: [...state.undoStack, state.current]
  } satisfies PageAutomergeHistoryState;
}

export function undoBlockTextHistory(
  state: PageAutomergeHistoryState,
  blockId: string
) {
  const previous = state.undoStack.at(-1);

  if (!previous) {
    return { state, text: null };
  }

  return {
    state: {
      ...state,
      current: previous,
      redoStack: [...state.redoStack, state.current],
      undoStack: state.undoStack.slice(0, -1)
    } satisfies PageAutomergeHistoryState,
    text: getBlockText(previous, blockId)
  };
}

export function redoBlockTextHistory(
  state: PageAutomergeHistoryState,
  blockId: string
) {
  const next = state.redoStack.at(-1);

  if (!next) {
    return { state, text: null };
  }

  return {
    state: {
      ...state,
      current: next,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, state.current]
    } satisfies PageAutomergeHistoryState,
    text: getBlockText(next, blockId)
  };
}

function getBlockText(document: PageDoc, blockId: string) {
  return toPageDocument(document).blocks.find((block) => block.id === blockId)
    ?.text ?? null;
}
