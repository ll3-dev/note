import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, type DatabaseHandle } from "../database";
import {
  createBlock,
  createPage,
  deleteBlock,
  getPageDocument,
  moveBlock,
  updateBlock
} from "../notes";
import { redoPageHistory, undoPageHistory } from "./pageHistory";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("page history", () => {
  test("undoes and redoes persisted block text updates", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "History" });
    const block = document.blocks[0];

    updateBlock(handle, { blockId: block.id, text: "first" });
    updateBlock(handle, { blockId: block.id, text: "second" });

    expect(undoPageHistory(handle, { pageId: block.pageId })?.blocks[0].text).toBe(
      "first"
    );
    expect(redoPageHistory(handle, { pageId: block.pageId })?.blocks[0].text).toBe(
      "second"
    );
  });

  test("undoes block create, delete, and move operations", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "Structure" });
    const first = document.blocks[0];

    const second = createBlock(handle, {
      afterBlockId: first.id,
      pageId: first.pageId,
      text: "Second"
    });
    expect(getPageDocument(handle, { pageId: first.pageId }).blocks).toHaveLength(2);

    expect(undoPageHistory(handle, { pageId: first.pageId })?.blocks).toHaveLength(1);
    expect(redoPageHistory(handle, { pageId: first.pageId })?.blocks).toHaveLength(2);

    moveBlock(handle, { afterBlockId: null, blockId: second.id });
    expect(getPageDocument(handle, { pageId: first.pageId }).blocks[0].id).toBe(
      second.id
    );
    expect(undoPageHistory(handle, { pageId: first.pageId })?.blocks[0].id).toBe(
      first.id
    );

    deleteBlock(handle, { blockId: second.id });
    expect(getPageDocument(handle, { pageId: first.pageId }).blocks).toHaveLength(1);
    expect(undoPageHistory(handle, { pageId: first.pageId })?.blocks).toHaveLength(2);
  });
});

function openTempDatabase(): DatabaseHandle {
  const root = mkdtempSync(path.join(tmpdir(), "note-history-test-"));
  tempRoots.push(root);
  return openDatabase(root);
}
