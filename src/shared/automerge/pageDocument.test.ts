import { describe, expect, test } from "bun:test";
import * as Automerge from "@automerge/automerge";
import type { Block, PageDocument } from "@/shared/contracts";
import {
  changeBlockText,
  changePageTitle,
  createAutomergePageDocument,
  insertBlockAfter,
  mergeAutomergePageDocuments,
  shouldCaptureAutomergeHistory,
  toPageDocument
} from "./pageDocument";

const pageDocument = {
  blocks: [
    block("block-1", "First"),
    block("block-2", "Second")
  ],
  page: {
    archivedAt: null,
    cover: null,
    createdAt: "2026-04-28T00:00:00.000Z",
    icon: null,
    id: "page-1",
    parentPageId: null,
    sortKey: "00000000",
    title: "Draft",
    updatedAt: "2026-04-28T00:00:00.000Z"
  }
} satisfies PageDocument;

describe("Automerge page document", () => {
  test("round-trips the current page document shape", () => {
    const automergeDocument = createAutomergePageDocument(pageDocument);

    expect(toPageDocument(automergeDocument)).toEqual(pageDocument);
  });

  test("merges concurrent edits with shared ancestry", () => {
    const base = createAutomergePageDocument(pageDocument);
    const titleEdit = changePageTitle(base, "Published");
    const textEdit = changeBlockText(Automerge.clone(base), "block-1", "Edited");

    const merged = toPageDocument(
      mergeAutomergePageDocuments(titleEdit, textEdit)
    );

    expect(merged.page.title).toBe("Published");
    expect(merged.blocks[0].text).toBe("Edited");
  });

  test("keeps independent concurrent block inserts", () => {
    const base = createAutomergePageDocument(pageDocument);
    const left = insertBlockAfter(base, "block-1", block("left", "Left"));
    const right = insertBlockAfter(
      Automerge.clone(base),
      "block-1",
      block("right", "Right")
    );
    const merged = toPageDocument(mergeAutomergePageDocuments(left, right));

    expect(merged.blocks.map((item) => item.id).sort()).toEqual([
      "block-1",
      "block-2",
      "left",
      "right"
    ]);
  });

  test("captures only local changes for future selective undo", () => {
    expect(shouldCaptureAutomergeHistory("local")).toEqual({
      capture: true,
      origin: "local"
    });
    expect(shouldCaptureAutomergeHistory("remote")).toEqual({
      capture: false,
      origin: "remote"
    });
    expect(shouldCaptureAutomergeHistory("sync")).toEqual({
      capture: false,
      origin: "sync"
    });
  });
});

function block(id: string, text: string): Block {
  return {
    createdAt: "2026-04-28T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    sortKey: id,
    text,
    type: "paragraph",
    updatedAt: "2026-04-28T00:00:00.000Z"
  };
}
