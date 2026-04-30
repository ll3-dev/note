import * as Automerge from "@automerge/automerge";
import type { Block, PageDocument } from "@/shared/contracts";

export type AutomergePageBlock = Omit<Block, "props"> & {
  props: Record<string, unknown>;
};

export type AutomergePageDocument = {
  schemaVersion: 1;
  page: PageDocument["page"];
  blocks: AutomergePageBlock[];
};

export type AutomergeChangeOrigin = "local" | "remote" | "sync" | "system";

export type AutomergeHistoryPolicy = {
  capture: boolean;
  origin: AutomergeChangeOrigin;
};

export function createAutomergePageDocument(document: PageDocument) {
  return Automerge.from<AutomergePageDocument>(toAutomergePageDocument(document));
}

export function mergeAutomergePageDocuments(
  left: Automerge.Doc<AutomergePageDocument>,
  right: Automerge.Doc<AutomergePageDocument>
) {
  return Automerge.merge(left, Automerge.clone(right));
}

export function toAutomergePageDocument(
  document: PageDocument
): AutomergePageDocument {
  return {
    blocks: document.blocks.map((block) => ({
      ...block,
      props: { ...block.props }
    })),
    page: { ...document.page },
    schemaVersion: 1
  };
}

export function toPageDocument(
  document: Automerge.Doc<AutomergePageDocument>
): PageDocument {
  return {
    blocks: document.blocks.map((block) => ({
      ...block,
      props: { ...block.props }
    })),
    page: { ...document.page }
  };
}

export function changePageTitle(
  document: Automerge.Doc<AutomergePageDocument>,
  title: string
) {
  return Automerge.change(document, (draft) => {
    draft.page.title = title;
  });
}

export function changeBlockText(
  document: Automerge.Doc<AutomergePageDocument>,
  blockId: string,
  text: string
) {
  return Automerge.change(document, (draft) => {
    const block = draft.blocks.find((item) => item.id === blockId);

    if (block) {
      block.text = text;
    }
  });
}

export function insertBlockAfter(
  document: Automerge.Doc<AutomergePageDocument>,
  afterBlockId: string | null,
  block: AutomergePageBlock
) {
  return Automerge.change(document, (draft) => {
    const index =
      afterBlockId === null
        ? -1
        : draft.blocks.findIndex((item) => item.id === afterBlockId);

    draft.blocks.splice(index + 1, 0, { ...block, props: { ...block.props } });
  });
}

export function shouldCaptureAutomergeHistory(
  origin: AutomergeChangeOrigin
): AutomergeHistoryPolicy {
  return {
    capture: origin === "local",
    origin
  };
}
