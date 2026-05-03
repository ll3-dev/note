import { test, expect } from "bun:test";
import { findInBlocks } from "./pageSearch";

test("finds all occurrences across blocks", () => {
  const blocks = [
    { id: "a", text: "Hello world" },
    { id: "b", text: "hello again" },
    { id: "c", text: "no match" }
  ];

  const results = findInBlocks(blocks, "hello");
  expect(results).toHaveLength(2);
  expect(results[0]).toEqual({ blockId: "a", offset: 0, length: 5 });
  expect(results[1]).toEqual({ blockId: "b", offset: 0, length: 5 });
});

test("finds multiple matches in one block", () => {
  const blocks = [
    { id: "a", text: "cat and cat" }
  ];

  const results = findInBlocks(blocks, "cat");
  expect(results).toHaveLength(2);
  expect(results[0].offset).toBe(0);
  expect(results[1].offset).toBe(8);
});

test("returns empty for empty query", () => {
  expect(findInBlocks([], "hello")).toHaveLength(0);
  expect(findInBlocks([{ id: "a", text: "hi" }], "")).toHaveLength(0);
});
