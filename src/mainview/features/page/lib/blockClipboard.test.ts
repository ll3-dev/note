import { describe, expect, test } from "bun:test";
import type { Block, PageDocument } from "@/shared/contracts";
import {
  copyBlocksToClipboard,
  readBlockClipboardPaste
} from "./blockClipboard";

describe("block clipboard", () => {
  test("keeps an internal block payload when the system clipboard still matches", async () => {
    let clipboardText = "";
    stubClipboard({
      readText: async () => clipboardText,
      writeText: async (text) => {
        clipboardText = text;
      }
    });

    await copyBlocksToClipboard(pageDocument, [pageDocument.blocks[0]]);

    const paste = await readBlockClipboardPaste();

    expect(paste).toEqual({
      drafts: [
        {
          props: { depth: 1 },
          text: "First",
          type: "bulleted_list"
        }
      ],
      kind: "blocks"
    });
  });

  test("falls back to markdown when another app replaces the clipboard text", async () => {
    let clipboardText = "";
    stubClipboard({
      readText: async () => clipboardText,
      writeText: async (text) => {
        clipboardText = text;
      }
    });

    await copyBlocksToClipboard(pageDocument, [pageDocument.blocks[0]]);
    clipboardText = "# External";

    const paste = await readBlockClipboardPaste();

    expect(paste).toEqual({
      drafts: [
        {
          props: {},
          text: "External",
          type: "heading_1"
        }
      ],
      kind: "markdown"
    });
  });
});

const pageDocument: PageDocument = {
  blocks: [
    {
      createdAt: "2026-04-30T00:00:00.000Z",
      id: "block-1",
      pageId: "page-1",
      parentBlockId: null,
      props: { depth: 1 },
      sortKey: "a",
      text: "First",
      type: "bulleted_list",
      updatedAt: "2026-04-30T00:00:00.000Z"
    } satisfies Block
  ],
  page: {
    archivedAt: null,
    cover: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    icon: null,
    id: "page-1",
    parentPageId: null,
    sortKey: "a",
    title: "Page",
    updatedAt: "2026-04-30T00:00:00.000Z"
  }
};

function stubClipboard(clipboard: {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
}) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard, platform: "MacIntel" }
  });
}
