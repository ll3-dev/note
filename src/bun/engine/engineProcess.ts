import { spawn, type ChildProcessByStdio } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

export type EngineProcess = {
  baseUrl: string;
  token: string;
  stop: () => void;
};

export async function startEngineProcess(
  userDataPath: string
): Promise<EngineProcess> {
  const binaryPath = resolveEngineBinaryPath();
  const child = spawn(binaryPath, [userDataPath], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    console.error(`[note-engine] ${String(chunk).trimEnd()}`);
  });

  const { baseUrl, token } = await waitForEngineListening(child);

  return {
    baseUrl,
    token,
    stop: () => {
      child.kill();
    }
  };
}

function resolveEngineBinaryPath() {
  const candidates = [
    process.env["NOTE_ENGINE_BINARY"],
    path.resolve("target/debug/note-engine"),
    path.resolve("bin/note-engine"),
    path.resolve("../Resources/app/bin/note-engine")
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
  child: ChildProcessByStdio<null, Readable, Readable>
): Promise<{ baseUrl: string; token: string }> {
  let buffer = "";
  child.stdout.setEncoding("utf8");

  for await (const chunk of child.stdout) {
    buffer += chunk;
    const match = buffer.match(
      /NOTE_ENGINE_LISTENING (http:\/\/127\.0\.0\.1:\d+) ([a-f0-9-]+)/
    );

    if (match) {
      return { baseUrl: match[1], token: match[2] };
    }
  }

  const [code] = await once(child, "exit");
  throw new Error(`engine exited before listening: ${String(code)}`);
}
