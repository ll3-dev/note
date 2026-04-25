import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, type DatabaseHandle } from "./database";
import {
  createBlock,
  createPage,
  deleteBlock,
  getPageDocument,
  listPages,
  moveBlock,
  updateBlock
} from "./notes";

const tempRoots: string[] = [];

function openTempDatabase(): DatabaseHandle {
  const root = mkdtempSync(path.join(tmpdir(), "note-test-"));
  tempRoots.push(root);
  return openDatabase(root);
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("notes repository", () => {
  test("creates a page with an initial paragraph block and returns the document", () => {
    const handle = openTempDatabase();

    const created = createPage(handle, { title: "Project notes" });
    const page = created.page;
    const document = getPageDocument(handle, { pageId: page.id });

    expect(document.page.title).toBe("Project notes");
    expect(document.blocks).toHaveLength(1);
    expect(document.blocks[0]).toMatchObject({
      pageId: page.id,
      parentBlockId: null,
      type: "paragraph",
      text: "",
      props: {}
    });
  });

  test("lists pages ordered by recent updates", () => {
    const handle = openTempDatabase();

    const first = createPage(handle, { title: "First" });
    const second = createPage(handle, { title: "Second" });

    const pages = listPages(handle);

    expect(pages.map((page) => page.id)).toEqual([
      second.page.id,
      first.page.id
    ]);
  });

  test("creates, updates, and deletes blocks in a page document", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Daily" }).page;

    const block = createBlock(handle, {
      pageId: page.id,
      type: "todo",
      text: "Ship block foundation",
      props: { checked: false }
    });
    const updated = updateBlock(handle, {
      blockId: block.id,
      text: "Ship page document foundation",
      props: { checked: true }
    });

    expect(updated.text).toBe("Ship page document foundation");
    expect(updated.props).toEqual({ checked: true });

    deleteBlock(handle, { blockId: block.id });

    const document = getPageDocument(handle, { pageId: page.id });
    expect(document.blocks.map((item) => item.id)).not.toContain(block.id);
  });

  test("inserts blocks after an existing block without sort key collisions", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Ordered" }).page;
    const document = getPageDocument(handle, { pageId: page.id });
    const first = document.blocks[0];

    const third = createBlock(handle, {
      pageId: page.id,
      afterBlockId: first.id,
      text: "Third"
    });
    const second = createBlock(handle, {
      pageId: page.id,
      afterBlockId: first.id,
      text: "Second"
    });

    const ordered = getPageDocument(handle, { pageId: page.id }).blocks;

    expect(ordered.map((block) => block.id)).toEqual([
      first.id,
      second.id,
      third.id
    ]);
    expect(new Set(ordered.map((block) => block.sortKey)).size).toBe(
      ordered.length
    );
  });

  test("moves blocks within a page document and rewrites sort keys", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Movable" }).page;
    const document = getPageDocument(handle, { pageId: page.id });
    const first = document.blocks[0];
    const second = createBlock(handle, {
      pageId: page.id,
      afterBlockId: first.id,
      text: "Second"
    });
    const third = createBlock(handle, {
      pageId: page.id,
      afterBlockId: second.id,
      text: "Third"
    });

    moveBlock(handle, { blockId: third.id, afterBlockId: null });

    const movedToStart = getPageDocument(handle, { pageId: page.id }).blocks;
    expect(movedToStart.map((block) => block.id)).toEqual([
      third.id,
      first.id,
      second.id
    ]);

    moveBlock(handle, { blockId: third.id, afterBlockId: second.id });

    const movedToEnd = getPageDocument(handle, { pageId: page.id }).blocks;
    expect(movedToEnd.map((block) => block.id)).toEqual([
      first.id,
      second.id,
      third.id
    ]);
    expect(movedToEnd.map((block) => block.sortKey)).toEqual([
      "00000000",
      "00000001",
      "00000002"
    ]);
  });
});
