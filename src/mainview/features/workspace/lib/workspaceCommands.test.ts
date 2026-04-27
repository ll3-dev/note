import { describe, expect, test } from "bun:test";
import { resolveKeybinding } from "@/mainview/features/commands/keybindingResolver";
import { WORKSPACE_COMMANDS } from "./workspaceCommands";

describe("workspace commands", () => {
  test("toggles the sidebar with Mod+Backslash", () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        toggleSidebar: () => {
          calls.push("toggleSidebar");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "\\",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.sidebar.toggle");
    command?.run({
      toggleSidebar: () => {
        calls.push("toggleSidebar");
      }
    });
    expect(calls).toEqual(["toggleSidebar"]);
  });
});
