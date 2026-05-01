import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, type DatabaseHandle } from "./database";
import {
  createBlock,
  createBlocks,
  createPage,
  deleteBlock,
  deleteBlocks,
  getPageDocument,
  listPages,
  moveBlock,
  movePage,
  undoPageHistory,
  updatePage,
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

  test("lists pages by tree sort order", () => {
    const handle = openTempDatabase();

    const first = createPage(handle, { title: "First" });
    const second = createPage(handle, { title: "Second" });

    const pages = listPages(handle);

    expect(pages.map((page) => page.id)).toEqual([
      first.page.id,
      second.page.id
    ]);
  });

  test("moves pages within a parent and under another page", () => {
    const handle = openTempDatabase();
    const first = createPage(handle, { title: "First" }).page;
    const second = createPage(handle, { title: "Second" }).page;
    const third = createPage(handle, { title: "Third" }).page;

    movePage(handle, {
      afterPageId: null,
      pageId: third.id,
      parentPageId: null
    });

    expect(
      listPages(handle)
        .filter((page) => page.parentPageId === null)
        .map((page) => page.id)
    ).toEqual([third.id, first.id, second.id]);

    const movedChild = movePage(handle, {
      afterPageId: null,
      pageId: second.id,
      parentPageId: first.id
    });

    expect(movedChild.parentPageId).toBe(first.id);
    expect(
      listPages(handle)
        .filter((page) => page.parentPageId === first.id)
        .map((page) => page.id)
    ).toEqual([second.id]);
  });

  test("updates a page title", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Draft" }).page;

    const updated = updatePage(handle, {
      pageId: page.id,
      title: "Published"
    });

    expect(updated.title).toBe("Published");
    expect(getPageDocument(handle, { pageId: page.id }).page.title).toBe(
      "Published"
    );
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

  test("normalizes inline marks before storing block props", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Formatting" }).page;

    const block = createBlock(handle, {
      pageId: page.id,
      text: "Hello world",
      props: {
        inlineMarks: [
          { end: 5, start: 0, type: "bold" },
          { end: 50, start: 6, type: "code" },
          { end: 11, href: "https://example.com", start: 6, type: "link" },
          { end: 5, href: "javascript:alert", start: 0, type: "link" },
          { end: 2, start: 2, type: "italic" },
          { end: 4, start: 1, type: "unknown" }
        ]
      }
    });

    expect(block.props).toEqual({
      inlineMarks: [
        { end: 5, start: 0, type: "bold" },
        { end: 11, start: 6, type: "code" },
        { end: 11, href: "https://example.com", start: 6, type: "link" }
      ]
    });

    const updated = updateBlock(handle, {
      blockId: block.id,
      text: "Hello",
      props: block.props
    });

    expect(updated.props).toEqual({
      inlineMarks: [{ end: 5, start: 0, type: "bold" }]
    });
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

  test("records batch block creation as one undo step", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Paste" }).page;
    const first = getPageDocument(handle, { pageId: page.id }).blocks[0];

    createBlocks(handle, {
      blocks: [
        { afterBlockId: first.id, pageId: page.id, text: "One" },
        { afterBlockId: null, pageId: page.id, text: "Two" }
      ]
    });

    expect(getPageDocument(handle, { pageId: page.id }).blocks.map((block) => block.text)).toEqual([
      "",
      "One",
      "Two"
    ]);

    expect(undoPageHistory(handle, { pageId: page.id })?.blocks.map((block) => block.text)).toEqual([
      ""
    ]);
  });

  test("records batch block deletion and fallback creation as one undo step", () => {
    const handle = openTempDatabase();
    const page = createPage(handle, { title: "Delete" }).page;
    const first = getPageDocument(handle, { pageId: page.id }).blocks[0];
    const second = createBlock(handle, {
      afterBlockId: first.id,
      pageId: page.id,
      text: "Second"
    });

    deleteBlocks(handle, {
      blockIds: [first.id, second.id],
      fallbackBlock: {
        pageId: page.id,
        text: "",
        type: "paragraph"
      }
    });

    expect(getPageDocument(handle, { pageId: page.id }).blocks.map((block) => block.text)).toEqual([
      ""
    ]);

    expect(undoPageHistory(handle, { pageId: page.id })?.blocks.map((block) => block.text)).toEqual([
      "",
      "Second"
    ]);
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
