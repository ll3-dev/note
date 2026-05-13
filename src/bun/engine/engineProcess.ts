import { dlopen, FFIType, suffix } from "bun:ffi";
import { existsSync } from "node:fs";
import path from "node:path";

export type EngineProcess = {
  invoke: (command: string, args: unknown) => unknown;
  stop: () => void;
};

export function startEngineProcess(userDataPath: string): EngineProcess {
  const libraryPath = resolveEngineLibraryPath();

  const library = dlopen(libraryPath, {
    rustra_note_invoke: {
      args: [FFIType.cstring],
      returns: FFIType.cstring,
    },
  });

  return {
    invoke(command: string, args: unknown) {
      const payload = JSON.stringify({ command, args, userDataPath });
      const resultJson = library.symbols
        .rustra_note_invoke(payload as unknown as Uint8Array) as unknown as string;

      const parsed = JSON.parse(resultJson);
      if (!parsed.ok) {
        throw Object.assign(new Error(parsed.error), parsed);
      }
      return parsed.result;
    },
    stop() {
      // No-op: library unloads on process exit
    },
  };
}

function resolveEngineLibraryPath(
  env: NodeJS.ProcessEnv = process.env,
  baseDir = process.cwd()
) {
  const ext = suffix;
  const candidates = [
    env["NOTE_BRIDGE_LIBRARY"],
    path.resolve(baseDir, `target/debug/libnote_bridge${ext}`),
    path.resolve(baseDir, `bin/libnote_bridge${ext}`),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      `note-bridge library not found. Checked: ${candidates.join(", ")}`
    );
  }
  return found;
}
