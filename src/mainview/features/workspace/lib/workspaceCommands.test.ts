import { describe, expect, test } from "bun:test";
import { resolveKeybinding } from "@/mainview/features/commands/keybindingResolver";
import { WORKSPACE_COMMANDS } from "./workspaceCommands";

const noopContext = {
  closeActiveTab: async () => {},
  navigateBack: async () => {},
  navigateForward: async () => {},
  openQuickSwitcher: () => {},
  openSettings: () => {},
  toggleSidebar: () => {}
};

describe("workspace commands", () => {
  test("toggles the sidebar with Mod+Backslash", () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        openQuickSwitcher: () => {},
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
      ...noopContext,
      openQuickSwitcher: () => {},
      toggleSidebar: () => {
        calls.push("toggleSidebar");
      }
    });
    expect(calls).toEqual(["toggleSidebar"]);
  });

  test("closes the active tab with Mod+W", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        closeActiveTab: async () => {
          calls.push("closeActiveTab");
        },
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "w",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.tab.closeActive");
    await command?.run({
      ...noopContext,
      closeActiveTab: async () => {
        calls.push("closeActiveTab");
      }
    });
    expect(calls).toEqual(["closeActiveTab"]);
  });

  test("opens the quick switcher with Mod+P", () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        openQuickSwitcher: () => {
          calls.push("openQuickSwitcher");
        },
        toggleSidebar: () => {}
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "p",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.quickSwitcher.open");
    command?.run({
      ...noopContext,
      openQuickSwitcher: () => {
        calls.push("openQuickSwitcher");
      },
      toggleSidebar: () => {}
    });
    expect(calls).toEqual(["openQuickSwitcher"]);
  });

  test("opens settings with Mod+Comma", () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        openSettings: () => {
          calls.push("openSettings");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: ",",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.settings.open");
    command?.run({
      ...noopContext,
      openSettings: () => {
        calls.push("openSettings");
      }
    });
    expect(calls).toEqual(["openSettings"]);
  });

  test("navigates back with Mod+LeftBracket", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        navigateBack: async () => {
          calls.push("navigateBack");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "[",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.history.back");
    await command?.run({
      ...noopContext,
      navigateBack: async () => {
        calls.push("navigateBack");
      }
    });
    expect(calls).toEqual(["navigateBack"]);
  });

  test("navigates back with Mod+ArrowLeft", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        navigateBack: async () => {
          calls.push("navigateBack");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "ArrowLeft",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.history.back");
    await command?.run({
      ...noopContext,
      navigateBack: async () => {
        calls.push("navigateBack");
      }
    });
    expect(calls).toEqual(["navigateBack"]);
  });

  test("navigates back with BrowserBack", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        navigateBack: async () => {
          calls.push("navigateBack");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "BrowserBack",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.history.back");
    await command?.run({
      ...noopContext,
      navigateBack: async () => {
        calls.push("navigateBack");
      }
    });
    expect(calls).toEqual(["navigateBack"]);
  });

  test("navigates forward with Mod+RightBracket", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        navigateForward: async () => {
          calls.push("navigateForward");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "]",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.history.forward");
    await command?.run({
      ...noopContext,
      navigateForward: async () => {
        calls.push("navigateForward");
      }
    });
    expect(calls).toEqual(["navigateForward"]);
  });

  test("navigates forward with Mod+ArrowRight", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        navigateForward: async () => {
          calls.push("navigateForward");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "ArrowRight",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.history.forward");
    await command?.run({
      ...noopContext,
      navigateForward: async () => {
        calls.push("navigateForward");
      }
    });
    expect(calls).toEqual(["navigateForward"]);
  });

  test("navigates forward with BrowserForward", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        ...noopContext,
        navigateForward: async () => {
          calls.push("navigateForward");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "BrowserForward",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.history.forward");
    await command?.run({
      ...noopContext,
      navigateForward: async () => {
        calls.push("navigateForward");
      }
    });
    expect(calls).toEqual(["navigateForward"]);
  });
});
