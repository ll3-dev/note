import { describe, expect, test } from "bun:test";
import { createCommandRegistry } from "./commandRegistry";
import type { Command } from "./types";

const commands: Command<Record<string, never>>[] = [
  {
    id: "workspace.newPage",
    scope: "workspace",
    title: "New page",
    run: () => {}
  },
  {
    id: "editor.block.createBelow",
    scope: "block",
    title: "Create block below",
    run: () => {}
  }
];

describe("command registry", () => {
  test("looks up commands by id and scope", () => {
    const registry = createCommandRegistry(commands);

    expect(registry.get("workspace.newPage")?.title).toBe("New page");
    expect(registry.byScope("block").map((command) => command.id)).toEqual([
      "editor.block.createBelow"
    ]);
  });

  test("rejects duplicate command ids", () => {
    expect(() =>
      createCommandRegistry([
        ...commands,
        {
          id: "workspace.newPage",
          scope: "workspace",
          title: "Duplicate",
          run: () => {}
        }
      ])
    ).toThrow("Duplicate command id: workspace.newPage");
  });
});
