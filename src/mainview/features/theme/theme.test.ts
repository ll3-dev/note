import { describe, expect, test } from "bun:test";
import { resolveThemeAppearance } from "./theme";

describe("theme appearance", () => {
  test("resolves system appearance from the OS preference", () => {
    expect(resolveThemeAppearance("system", true)).toBe("dark");
    expect(resolveThemeAppearance("system", false)).toBe("light");
  });

  test("keeps explicit light and dark appearances", () => {
    expect(resolveThemeAppearance("light", true)).toBe("light");
    expect(resolveThemeAppearance("dark", false)).toBe("dark");
  });
});
