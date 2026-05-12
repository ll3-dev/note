import { afterEach, describe, expect, test } from "bun:test";
import { createEngineClient } from "./engineClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("engine client", () => {
  test("maps database status from Rust response shape", async () => {
    const requests = mockFetch([
      jsonResponse({
        blocks_count: 2,
        pages_count: 1,
        sqlite_version: "3.45.0"
      })
    ]);
    const client = createEngineClient("http://127.0.0.1:49152", "token");

    await expect(client.getDatabaseStatus()).resolves.toEqual({
      blocksCount: 2,
      pagesCount: 1,
      sqliteVersion: "3.45.0"
    });
    expect(requests[0]?.url).toBe("http://127.0.0.1:49152/database/status");
    expect(requests[0]?.authorization).toBe("Bearer token");
  });

  test("encodes path and query parameters", async () => {
    const requests = mockFetch([jsonResponse({ page: {}, blocks: [] }), jsonResponse([])]);
    const client = createEngineClient("http://127.0.0.1:49152", "token");

    await client.getPageDocument({ pageId: "page/with space" });
    await client.searchWorkspace({ limit: 5, query: "rust engine" });

    expect(requests[0]?.url).toBe(
      "http://127.0.0.1:49152/pages/page%2Fwith%20space/document"
    );
    expect(requests[1]?.url).toBe(
      "http://127.0.0.1:49152/search/workspace?query=rust+engine&limit=5"
    );
  });

  test("sends JSON writes with token", async () => {
    const requests = mockFetch([
      jsonResponse({
        createdAt: "",
        id: "block-1",
        pageId: "page-1",
        parentBlockId: null,
        props: {},
        sortKey: "00000000",
        text: "Hello",
        type: "paragraph",
        updatedAt: ""
      })
    ]);
    const client = createEngineClient("http://127.0.0.1:49152", "token");

    await client.createBlock({ pageId: "page-1", text: "Hello" });

    expect(requests[0]).toMatchObject({
      authorization: "Bearer token",
      body: JSON.stringify({ pageId: "page-1", text: "Hello" }),
      contentType: "application/json",
      method: "POST",
      url: "http://127.0.0.1:49152/blocks"
    });
  });

  test("throws on engine errors", async () => {
    mockFetch([new Response("missing", { status: 404 })]);
    const client = createEngineClient("http://127.0.0.1:49152", "token");

    await expect(client.listPages()).rejects.toThrow(
      "engine request failed: /pages 404"
    );
  });
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}

function mockFetch(responses: Response[]) {
  const requests: Array<{
    authorization: string | null;
    body?: BodyInit | null;
    contentType: string | null;
    method: string;
    url: string;
  }> = [];

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const response = responses.shift();

    if (!response) {
      throw new Error("unexpected fetch");
    }

    requests.push({
      authorization: headerValue(init?.headers, "Authorization"),
      body: init?.body,
      contentType: headerValue(init?.headers, "Content-Type"),
      method: init?.method ?? "GET",
      url: String(input)
    });

    return Promise.resolve(response);
  }) as typeof fetch;

  return requests;
}

function headerValue(headers: HeadersInit | undefined, key: string) {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(key);
  }

  if (Array.isArray(headers)) {
    return headers.find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1] ?? null;
  }

  return headers[key] ?? headers[key.toLowerCase()] ?? null;
}
