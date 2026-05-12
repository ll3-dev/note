import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  parseEngineListeningMessage,
  resolveEngineBinaryPath
} from "./engineProcess";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("engine process", () => {
  test("parses engine startup output", () => {
    expect(
      parseEngineListeningMessage(
        "log\nNOTE_ENGINE_LISTENING http://127.0.0.1:49152 token-123\n"
      )
    ).toEqual({
      baseUrl: "http://127.0.0.1:49152",
      token: "token-123"
    });
    expect(parseEngineListeningMessage("NOTE_ENGINE_LISTENING")).toBeNull();
  });

  test("resolves engine binary from explicit environment first", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "note-engine-path-"));
    tempRoots.push(tempDir);
    const explicitBinary = path.join(tempDir, "custom-note-engine");
    const cwdBinary = path.join(tempDir, "target/debug/note-engine");

    mkdirSync(path.dirname(cwdBinary), { recursive: true });
    writeFileSync(explicitBinary, "");
    writeFileSync(cwdBinary, "");

    expect(
      resolveEngineBinaryPath({ NOTE_ENGINE_BINARY: explicitBinary }, tempDir)
    ).toBe(explicitBinary);
  });

  test("resolves development engine binary from project-relative path", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "note-engine-path-"));
    tempRoots.push(tempDir);
    const binary = path.join(tempDir, "target/debug/note-engine");

    mkdirSync(path.dirname(binary), { recursive: true });
    writeFileSync(binary, "");

    expect(resolveEngineBinaryPath({}, tempDir)).toBe(binary);
  });
});
