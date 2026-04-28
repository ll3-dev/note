import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { openDatabase, type DatabaseHandle } from "../database";
import { blocks } from "../schema";
import {
  createBlock,
  createPage,
  deleteBlock,
  getPageDocument,
  moveBlock,
  updateBlock
} from "../notes";
import { insertBlock } from "../repositories/blockRepository";
import {
  capturePageHistoryBeforeChange,
  clearPageHistoryMemoryForTests,
  redoPageHistory,
  syncPageHistoryAfterChange,
  undoPageHistory
} from "./pageHistory";

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

  test("keeps external block inserts when undoing a local text edit", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "Remote insert" });
    const first = document.blocks[0];

    updateBlock(handle, { blockId: first.id, text: "local" });
    insertBlock(handle, {
      pageId: first.pageId,
      parentBlockId: null,
      props: {},
      sortKey: "00000001",
      text: "remote",
      type: "paragraph"
    });

    const undone = undoPageHistory(handle, { pageId: first.pageId });

    expect(undone?.blocks.map((block) => block.text)).toEqual(["", "remote"]);
  });

  test("keeps external text edits when undoing a local block create", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "Remote text" });
    const first = document.blocks[0];

    const second = createBlock(handle, {
      afterBlockId: first.id,
      pageId: first.pageId,
      text: "local create"
    });
    updateBlockWithoutHistory(handle, first.id, "remote edit");

    const undone = undoPageHistory(handle, { pageId: first.pageId });

    expect(undone?.blocks.map((block) => block.id)).not.toContain(second.id);
    expect(undone?.blocks[0].text).toBe("remote edit");
  });

  test("does not record no-op page changes", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "No-op" });
    const first = document.blocks[0];

    updateBlock(handle, { blockId: first.id, text: first.text });

    expect(undoPageHistory(handle, { pageId: first.pageId })).toBeNull();
  });

  test("persists local history entries across in-memory state resets", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "Persistent" });
    const first = document.blocks[0];

    updateBlock(handle, { blockId: first.id, text: "local" });
    clearPageHistoryMemoryForTests();

    expect(undoPageHistory(handle, { pageId: first.pageId })?.blocks[0].text).toBe(
      ""
    );
  });

  test("does not undo remote-origin entries", () => {
    const handle = openTempDatabase();
    const document = createPage(handle, { title: "Remote origin" });
    const first = document.blocks[0];

    updateBlock(handle, { blockId: first.id, text: "local" });
    capturePageHistoryBeforeChange(handle, first.pageId, {
      actorId: "phone",
      origin: "remote"
    });
    updateBlockWithoutHistory(handle, first.id, "remote");
    syncPageHistoryAfterChange(handle, first.pageId, {
      actorId: "phone",
      origin: "remote"
    });

    const undone = undoPageHistory(handle, { pageId: first.pageId });

    expect(undone?.blocks[0].text).toBe("remote");
  });
});

function openTempDatabase(): DatabaseHandle {
  const root = mkdtempSync(path.join(tmpdir(), "note-history-test-"));
  tempRoots.push(root);
  return openDatabase(root);
}

function updateBlockWithoutHistory(
  handle: DatabaseHandle,
  blockId: string,
  text: string
) {
  handle.orm
    .update(blocks)
    .set({ text, updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(blocks.id, blockId))
    .run();
}
