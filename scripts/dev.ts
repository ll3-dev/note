const host = process.env.NOTE_VITE_HOST ?? "127.0.0.1";
const port = process.env.NOTE_VITE_PORT ?? "5173";
const mainviewUrl = process.env.NOTE_MAINVIEW_URL ?? `http://${host}:${port}`;
const bunExecutable = process.execPath;
const children: Array<ReturnType<typeof Bun.spawn>> = [];

let shuttingDown = false;

function stopChildren() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    child.kill();
  }
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(143);
});

async function waitForServer(url: string) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await Bun.sleep(150);
      continue;
    }

    await Bun.sleep(150);
  }

  throw new Error(`Vite dev server did not become ready at ${url}`);
}

const vite = Bun.spawn(
  [
    bunExecutable,
    "run",
    "dev:vite",
    "--",
    "--host",
    host,
    "--port",
    port,
    "--strictPort"
  ],
  {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env
  }
);
children.push(vite);

try {
  await waitForServer(mainviewUrl);

  const electrobun = Bun.spawn([bunExecutable, "run", "dev:electrobun"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      NOTE_MAINVIEW_URL: mainviewUrl
    }
  });
  children.push(electrobun);

  const exitCode = await electrobun.exited;
  stopChildren();
  process.exit(exitCode);
} catch (error) {
  stopChildren();
  console.error(error);
  process.exit(1);
}

export {};
