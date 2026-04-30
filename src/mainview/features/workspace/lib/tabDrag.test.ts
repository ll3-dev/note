import { describe, expect, test } from "bun:test";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";
import { getAfterTabIdForMovingTab } from "./tabDrag";

const tabs = ["a", "b", "c", "d"].map(createTab);

describe("tab drag", () => {
  test("finds an insertion point after removing the moving tab", () => {
    expect(getAfterTabIdForMovingTab(tabs, "b", "d", "after")).toBe("d");
    expect(getAfterTabIdForMovingTab(tabs, "c", "a", "before")).toBeNull();
    expect(getAfterTabIdForMovingTab(tabs, "b", "d", "before")).toBe("c");
  });

  test("returns null when the target is the moving tab", () => {
    expect(getAfterTabIdForMovingTab(tabs, "b", "b", "after")).toBeNull();
  });
});

function createTab(id: string): WorkspaceTab {
  return {
    id,
    pageId: id,
    title: id
  };
}
