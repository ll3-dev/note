import { describe, expect, test } from "bun:test";
import {
  BLOCK_COMMANDS,
  filterBlockCommands,
  getMarkdownShortcut
} from "./blockCommands";

describe("block command shortcuts", () => {
  test("converts heading shortcuts into typed blocks", () => {
    expect(getMarkdownShortcut("# ")).toEqual({
      props: {},
      text: "",
      type: "heading_1"
    });
    expect(getMarkdownShortcut("## ")).toEqual({
      props: {},
      text: "",
      type: "heading_2"
    });
    expect(getMarkdownShortcut("### ")).toEqual({
      props: {},
      text: "",
      type: "heading_3"
    });
  });

  test("converts list and todo shortcuts", () => {
    expect(getMarkdownShortcut("- ")).toEqual({
      props: {},
      text: "",
      type: "bulleted_list"
    });
    expect(getMarkdownShortcut("+ ")).toEqual({
      props: {},
      text: "",
      type: "bulleted_list"
    });
    expect(getMarkdownShortcut("5. ")).toEqual({
      props: { start: 5 },
      text: "",
      type: "numbered_list"
    });
    expect(getMarkdownShortcut("[] ")).toEqual({
      props: { checked: false },
      text: "",
      type: "todo"
    });
  });

  test("converts Notion quote shortcut", () => {
    expect(getMarkdownShortcut("\" ")).toEqual({
      props: {},
      text: "",
      type: "quote"
    });
  });

  test("converts Notion toggle shortcut", () => {
    expect(getMarkdownShortcut("> ")).toEqual({
      props: { open: true },
      text: "",
      type: "toggle"
    });
  });

  test("finds the toggle command by its greater-than alias", () => {
    expect(filterBlockCommands(">").map((command) => command.id)).toContain(
      "turn-into-toggle"
    );
  });

  test("converts divider shortcut and requests a following text block", () => {
    expect(getMarkdownShortcut("---")).toEqual({
      createBlockAfter: {
        props: {},
        text: "",
        type: "paragraph"
      },
      props: {},
      text: "",
      type: "divider"
    });
  });

  test("divider command requests a following editable text block", () => {
    const dividerCommand = BLOCK_COMMANDS.find(
      (command) => command.id === "turn-into-divider"
    );

    expect(dividerCommand?.createBlockAfter).toEqual({
      props: {},
      text: "",
      type: "paragraph"
    });
  });

  test("keeps direct block actions out of slash commands", () => {
    expect(BLOCK_COMMANDS.find((command) => command.id === "insert-paragraph-below"))
      .toBeUndefined();
    expect(BLOCK_COMMANDS.find((command) => command.id === "insert-todo-below"))
      .toBeUndefined();
    expect(BLOCK_COMMANDS.find((command) => command.id === "delete-current-block"))
      .toBeUndefined();
    expect(BLOCK_COMMANDS.find((command) => command.id === "turn-into-image"))
      .toMatchObject({
        action: "turnInto",
        type: "image"
      });
  });

  test("ignores regular paragraph text", () => {
    expect(getMarkdownShortcut("plain text")).toBeNull();
  });
});
