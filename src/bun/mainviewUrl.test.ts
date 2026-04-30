import { describe, expect, test } from "bun:test";
import { resolveDevMainviewConfig, resolveMainviewUrl } from "./mainviewUrl";

describe("mainview URL security", () => {
  test("uses the packaged view by default", () => {
    expect(resolveMainviewUrl({})).toBe("views://mainview/index.html");
  });

  test("allows loopback dev URLs", () => {
    expect(
      resolveDevMainviewConfig({
        NOTE_VITE_HOST: "127.0.0.1",
        NOTE_VITE_PORT: "5174"
      }).mainviewUrl
    ).toBe("http://127.0.0.1:5174");
  });

  test("rejects external mainview URLs", () => {
    expect(() =>
      resolveMainviewUrl({
        NOTE_MAINVIEW_DEV_SERVER: "1",
        NOTE_MAINVIEW_URL: "https://example.com"
      })
    ).toThrow("local http dev server");
  });

  test("rejects configured mainview URLs outside the dev launcher", () => {
    expect(() =>
      resolveMainviewUrl({ NOTE_MAINVIEW_URL: "http://127.0.0.1:5173" })
    ).toThrow("dev launcher");
  });

  test("rejects non-loopback dev hosts", () => {
    expect(() =>
      resolveDevMainviewConfig({
        NOTE_VITE_HOST: "0.0.0.0",
        NOTE_VITE_PORT: "5173"
      })
    ).toThrow("loopback host");
  });
});
