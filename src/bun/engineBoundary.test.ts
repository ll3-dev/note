import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

describe("Rust engine boundary", () => {
  test("Bun app shell does not open the note database directly", () => {
    const indexSource = readSource("src/bun/index.ts");

    expect(indexSource).not.toContain("openDatabase");
    expect(indexSource).not.toContain("./notes");
    expect(indexSource).not.toContain("./repositories");
    expect(indexSource).not.toContain("./sync/pageHistory");
  });

  test("mainview does not import Bun storage modules", () => {
    const mainviewSources = Array.from(
      new Bun.Glob("src/mainview/**/*.ts").scanSync(projectRoot)
    ).concat(
      Array.from(new Bun.Glob("src/mainview/**/*.tsx").scanSync(projectRoot))
    );

    for (const sourcePath of mainviewSources) {
      const source = readSource(sourcePath);

      expect(source, sourcePath).not.toContain("@/bun/notes");
      expect(source, sourcePath).not.toContain("@/bun/repositories");
      expect(source, sourcePath).not.toContain("@/bun/sync/pageHistory");
    }
  });

  test("shared engine client stays host runtime agnostic", () => {
    const source = readSource("src/shared/engineClient.ts");

    expect(source).not.toContain("electrobun");
    expect(source).not.toContain("@/bun/");
    expect(source).not.toContain("node:");
  });
});

function readSource(sourcePath: string) {
  return readFileSync(path.join(projectRoot, sourcePath), "utf8");
}
