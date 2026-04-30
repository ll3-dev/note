const DEFAULT_MAINVIEW_URL = "views://mainview/index.html";
const DEFAULT_DEV_HOST = "127.0.0.1";
const DEFAULT_DEV_PORT = "5173";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

type MainviewEnv = Record<string, string | undefined>;

export function getDefaultMainviewUrl() {
  return DEFAULT_MAINVIEW_URL;
}

export function resolveMainviewUrl(env: MainviewEnv = process.env) {
  const configuredUrl = env.NOTE_MAINVIEW_URL;

  if (!configuredUrl) {
    return DEFAULT_MAINVIEW_URL;
  }

  if (env.NOTE_MAINVIEW_DEV_SERVER !== "1") {
    throw new Error("NOTE_MAINVIEW_URL is only allowed through the dev launcher");
  }

  assertAllowedMainviewUrl(configuredUrl);
  return configuredUrl;
}

export function resolveDevMainviewConfig(env: MainviewEnv = process.env) {
  const host = env.NOTE_VITE_HOST ?? DEFAULT_DEV_HOST;
  const port = env.NOTE_VITE_PORT ?? DEFAULT_DEV_PORT;
  assertLoopbackHost(host);
  assertPort(port);

  const mainviewUrl = env.NOTE_MAINVIEW_URL ?? `http://${host}:${port}`;
  assertAllowedMainviewUrl(mainviewUrl);

  return { devServerToken: "1", host, mainviewUrl, port };
}

export function assertAllowedMainviewUrl(value: string) {
  if (value === DEFAULT_MAINVIEW_URL) {
    return;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("NOTE_MAINVIEW_URL must be a valid URL");
  }

  if (url.protocol !== "http:") {
    throw new Error("NOTE_MAINVIEW_URL only supports the packaged view or local http dev server");
  }

  assertLoopbackHost(url.hostname);
  assertPort(url.port);
}

function assertLoopbackHost(host: string) {
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("NOTE_MAINVIEW_URL and NOTE_VITE_HOST must use a loopback host");
  }
}

function assertPort(port: string) {
  const parsed = Number.parseInt(port, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535 || `${parsed}` !== port) {
    throw new Error("NOTE_VITE_PORT must be an integer from 1 to 65535");
  }
}
