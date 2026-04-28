import { describe, expect, test } from "bun:test";
import type { Block, PageDocument } from "../../../../shared/contracts";
import {
  createPageAutomergeHistory,
  recordBlockTextHistory,
  redoBlockTextHistory,
  undoBlockTextHistory
} from "./pageAutomergeHistory";

describe("page Automerge history", () => {
  test("undoes and redoes block text edits", () => {
    const document = pageDocument();
    let state = createPageAutomergeHistory(document);

    state = recordBlockTextHistory(state, document.blocks[0], "first edit");
    state = recordBlockTextHistory(state, document.blocks[0], "second edit");

    const firstUndo = undoBlockTextHistory(state, "block-1");
    expect(firstUndo.text).toBe("first edit");

    const secondUndo = undoBlockTextHistory(firstUndo.state, "block-1");
    expect(secondUndo.text).toBe("initial");

    const redo = redoBlockTextHistory(secondUndo.state, "block-1");
    expect(redo.text).toBe("first edit");
  });

  test("does not record no-op text changes", () => {
    const document = pageDocument();
    const state = createPageAutomergeHistory(document);
    const next = recordBlockTextHistory(state, document.blocks[0], "initial");

    expect(next.undoStack).toHaveLength(0);
  });
});

function pageDocument(): PageDocument {
  return {
    blocks: [block("block-1", "initial")],
    page: {
      archivedAt: null,
      cover: null,
      createdAt: "2026-04-28T00:00:00.000Z",
      icon: null,
      id: "page-1",
      parentPageId: null,
      sortKey: "00000000",
      title: "Page",
      updatedAt: "2026-04-28T00:00:00.000Z"
    }
  };
}

function block(id: string, text: string): Block {
  return {
    createdAt: "2026-04-28T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    sortKey: "00000000",
    text,
    type: "paragraph",
    updatedAt: "2026-04-28T00:00:00.000Z"
  };
}
