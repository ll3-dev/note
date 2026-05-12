import { spawn, type ChildProcessByStdio } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

const DEFAULT_ENGINE_START_TIMEOUT_MS = 5000;

export type EngineProcess = {
  baseUrl: string;
  token: string;
  stop: () => void;
};

export type EngineListenInfo = {
  baseUrl: string;
  token: string;
};

export async function startEngineProcess(
  userDataPath: string,
  options: { startTimeoutMs?: number } = {}
): Promise<EngineProcess> {
  const binaryPath = resolveEngineBinaryPath();
  const child = spawn(binaryPath, [userDataPath], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    console.error(`[note-engine] ${String(chunk).trimEnd()}`);
  });

  const { baseUrl, token } = await waitForEngineListening(
    child,
    options.startTimeoutMs ?? DEFAULT_ENGINE_START_TIMEOUT_MS
  );

  return {
    baseUrl,
    token,
    stop: () => {
      child.kill();
    }
  };
}

export function resolveEngineBinaryPath(
  env: NodeJS.ProcessEnv = process.env,
  baseDir = process.cwd()
) {
  const candidates = [
    env["NOTE_ENGINE_BINARY"],
    path.resolve(baseDir, "target/debug/note-engine"),
    path.resolve(baseDir, "bin/note-engine"),
    path.resolve(baseDir, "../Resources/app/bin/note-engine")
  ].filter((candidate): candidate is string => Boolean(candidate));

  const binaryPath = candidates.find((candidate) => existsSync(candidate));

  if (!binaryPath) {
    throw new Error(
      `note-engine binary not found. Checked: ${candidates.join(", ")}`
    );
  }

  return binaryPath;
}

async function waitForEngineListening(
  child: ChildProcessByStdio<null, Readable, Readable>,
  timeoutMs: number
): Promise<EngineListenInfo> {
  let buffer = "";
  child.stdout.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off("data", handleStdout);
      child.off("error", handleError);
      child.off("exit", handleExit);
    };
    const handleStdout = (chunk: string) => {
      buffer += chunk;
      const listenInfo = parseEngineListeningMessage(buffer);

      if (listenInfo) {
        cleanup();
        resolve(listenInfo);
      }
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `engine exited before listening: code=${String(code)} signal=${String(signal)}`
        )
      );
    };
    const timeout = setTimeout(() => {
      cleanup();
      child.kill();
      reject(new Error(`engine did not start within ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", handleStdout);
    child.once("error", handleError);
    child.once("exit", handleExit);
  });
}

export function parseEngineListeningMessage(value: string): EngineListenInfo | null {
  const match = value.match(
    /NOTE_ENGINE_LISTENING (http:\/\/127\.0\.0\.1:\d+) ([^\s]+)/
  );

  return match ? { baseUrl: match[1], token: match[2] } : null;
}
