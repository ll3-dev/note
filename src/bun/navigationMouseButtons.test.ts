import { describe, expect, test } from "bun:test";
import { getNavigationDirectionFromMouseButtons } from "./navigationMouseButtons";

describe("navigation mouse buttons", () => {
  test("detects back and forward side button press edges", () => {
    expect(getNavigationDirectionFromMouseButtons(0n, 1n << 3n)).toBe("back");
    expect(getNavigationDirectionFromMouseButtons(0n, 1n << 4n)).toBe("forward");
  });

  test("ignores held buttons and unrelated buttons", () => {
    expect(
      getNavigationDirectionFromMouseButtons(1n << 3n, 1n << 3n)
    ).toBeNull();
    expect(getNavigationDirectionFromMouseButtons(0n, 1n << 0n)).toBeNull();
    expect(getNavigationDirectionFromMouseButtons(0n, 1n << 2n)).toBeNull();
  });

  test("prefers back when both side buttons are newly pressed", () => {
    expect(getNavigationDirectionFromMouseButtons(0n, (1n << 3n) | (1n << 4n))).toBe(
      "back"
    );
  });
});
