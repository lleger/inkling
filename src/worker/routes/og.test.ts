import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../index";
import { createTestD1 } from "../db/test-d1";

const TEST_ENV = {
  BETTER_AUTH_SECRET: "test-secret-not-used-but-required",
  SIGNUP_MODE: "open",
  TEST_AUTH_BYPASS: "1",
} as const;

let db: D1Database;
beforeEach(() => {
  db = createTestD1();
});

function req(path: string) {
  return app.request(path, undefined, { ...TEST_ENV, DB: db });
}

describe("/api/og — input validation", () => {
  it("rejects missing url", async () => {
    const res = await req("/api/og");
    expect(res.status).toBe(400);
  });

  it("rejects malformed url", async () => {
    const res = await req("/api/og?url=not-a-url");
    expect(res.status).toBe(400);
  });

  it("rejects file:// scheme", async () => {
    const res = await req(`/api/og?url=${encodeURIComponent("file:///etc/passwd")}`);
    expect(res.status).toBe(400);
  });

  it("rejects javascript: scheme", async () => {
    const res = await req(`/api/og?url=${encodeURIComponent("javascript:alert(1)")}`);
    expect(res.status).toBe(400);
  });

  describe("SSRF guards", () => {
    const blocked = [
      "http://localhost/x",
      "http://localhost.localhost/x",
      "http://printer.local/x",
      "http://api.internal/x",
      "http://127.0.0.1/x",
      "http://127.42.1.1/x",
      "http://10.0.0.1/x",
      "http://10.255.255.255/x",
      "http://172.16.0.1/x",
      "http://172.31.255.255/x",
      "http://192.168.0.1/x",
      "http://169.254.169.254/x", // AWS metadata
      "http://[::1]/x",
      "http://[fe80::1]/x",
      "http://[fc00::1]/x",
      "http://[fd00::1]/x",
    ];
    for (const url of blocked) {
      it(`blocks ${url}`, async () => {
        const res = await req(`/api/og?url=${encodeURIComponent(url)}`);
        expect(res.status).toBe(400);
      });
    }
  });

  describe("public hostnames pass validation", () => {
    // We don't actually want to make outbound requests in unit tests, so we
    // mock global fetch to return a tiny stub response. The validator runs
    // before the fetch, so a non-400 result confirms validation passed.
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    beforeEach(() => {
      fetchSpy.mockReset();
      fetchSpy.mockImplementation(async () =>
        new Response(
          '<html><head><meta property="og:title" content="Hello"><meta property="og:description" content="World"></head><body></body></html>',
          { status: 200, headers: { "content-type": "text/html" } },
        ),
      );
      // Also mock caches.default which the route uses
      (globalThis as unknown as { caches: { default: Cache } }).caches = {
        default: {
          match: async () => undefined,
          put: async () => {},
        } as unknown as Cache,
      };
    });

    it("allows https://example.com", async () => {
      const res = await req("/api/og?url=https://example.com/page");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { title: string; description: string };
      expect(body.title).toBe("Hello");
      expect(body.description).toBe("World");
    });

    it("falls back to <title> when og:title absent", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          "<html><head><title>Plain Title</title></head><body></body></html>",
          { status: 200, headers: { "content-type": "text/html" } },
        ),
      );
      const res = await req("/api/og?url=https://example.com/page");
      const body = (await res.json()) as { title: string };
      expect(body.title).toBe("Plain Title");
    });

    it("returns minimal preview for non-HTML (image)", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("(binary)", { status: 200, headers: { "content-type": "image/png" } }),
      );
      const res = await req("/api/og?url=https://example.com/img.png");
      const body = (await res.json()) as { title: string | null; siteName: string };
      expect(body.title).toBeNull();
      expect(body.siteName).toBe("example.com");
    });

    it("returns 502 on upstream error", async () => {
      fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));
      const res = await req("/api/og?url=https://example.com/page");
      expect(res.status).toBe(502);
    });

    it("returns 502 when fetch throws (timeout, abort)", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("aborted"));
      const res = await req("/api/og?url=https://example.com/page");
      expect(res.status).toBe(502);
    });

    it("absolutizes relative og:image", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          '<html><head><meta property="og:title" content="X"><meta property="og:image" content="/img.jpg"></head></html>',
          { status: 200, headers: { "content-type": "text/html" } },
        ),
      );
      const res = await req("/api/og?url=https://example.com/page");
      const body = (await res.json()) as { image: string };
      expect(body.image).toBe("https://example.com/img.jpg");
    });
  });
});
