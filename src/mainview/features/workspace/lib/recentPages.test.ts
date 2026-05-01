import { describe, expect, test } from "bun:test";
import type { Page } from "@/shared/contracts";
import { getRecentPages } from "./recentPages";

describe("getRecentPages", () => {
  test("sorts pages by updated time and applies the limit", () => {
    const pages = [
      page("one", "2026-04-28T10:00:00.000Z"),
      page("two", "2026-04-30T10:00:00.000Z"),
      page("three", "2026-04-29T10:00:00.000Z")
    ];

    expect(getRecentPages(pages, 2).map((item) => item.id)).toEqual([
      "two",
      "three"
    ]);
  });
});

function page(id: string, updatedAt: string): Page {
  return {
    archivedAt: null,
    cover: null,
    createdAt: updatedAt,
    icon: null,
    id,
    parentPageId: null,
    sortKey: id,
    title: id,
    updatedAt
  };
}
