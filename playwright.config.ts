import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = Number(process.env.NOTE_E2E_PORT ?? 5174);
const E2E_ORIGIN = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  use: {
    baseURL: E2E_ORIGIN,
    trace: "on-first-retry"
  },
  webServer: {
    command: `NOTE_E2E_MOCK_RPC=1 bun run dev:vite -- --host 127.0.0.1 --port ${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: E2E_ORIGIN
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
