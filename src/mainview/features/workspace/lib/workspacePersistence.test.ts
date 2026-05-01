import { describe, expect, test } from "bun:test";
import { reconcileWorkspacePersistence } from "./workspacePersistence";

describe("reconcileWorkspacePersistence", () => {
  test("keeps persisted workspace state aligned to current pages", () => {
    const state = reconcileWorkspacePersistence(
      {
        activeTabId: "missing",
        expandedPageIds: ["page-a", "missing-page"],
        isSidebarCollapsed: true,
        selectedPageId: "missing-page",
        sidebarWidth: 280,
        tabs: [
          { id: "page-a", pageId: "page-a", title: "Old A" },
          { id: "missing", pageId: "missing-page", title: "Missing" },
          { id: "page-b", pageId: "page-b", title: "Old B" }
        ]
      },
      [
        { id: "page-a", title: "New A" },
        { id: "page-b", title: "New B" }
      ]
    );

    expect(state).toEqual({
      activeTabId: "page-b",
      expandedPageIds: ["page-a"],
      isSidebarCollapsed: true,
      selectedPageId: "page-b",
      sidebarWidth: 280,
      tabs: [
        { id: "page-a", pageId: "page-a", title: "New A" },
        { id: "page-b", pageId: "page-b", title: "New B" }
      ]
    });
  });

  test("restores home when every persisted tab is stale", () => {
    const state = reconcileWorkspacePersistence(
      {
        activeTabId: "missing",
        expandedPageIds: ["missing-page"],
        isSidebarCollapsed: false,
        selectedPageId: "missing-page",
        sidebarWidth: 320,
        tabs: [{ id: "missing", pageId: "missing-page", title: "Missing" }]
      },
      []
    );

    expect(state.activeTabId).toBeNull();
    expect(state.selectedPageId).toBeNull();
    expect(state.expandedPageIds).toEqual([]);
    expect(state.tabs).toEqual([]);
  });
});
