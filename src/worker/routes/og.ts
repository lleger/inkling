import { Hono } from "hono";
import type { Env } from "../types";

type AuthVars = { userId: string; userEmail: string };

export const ogRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB
const CACHE_TTL_SECONDS = 86_400; // 24h

export type OgPreview = {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
};

ogRoutes.get("/", async (c) => {
  const raw = c.req.query("url");
  const refresh = c.req.query("refresh") === "1";
  if (!raw) return c.json({ error: "missing url" }, 400);

  const url = validateUrl(raw);
  if (!url) return c.json({ error: "invalid or disallowed url" }, 400);

  // Cache key is a synthetic request URL keyed by the target. Keeps the
  // entry per-target regardless of which user asked.
  const cacheKey = new Request(`https://og-cache.invalid/${encodeURIComponent(url.toString())}`);
  const cache = caches.default;

  if (!refresh) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let res: Response;
  try {
    res = await fetchTarget(url);
  } catch (e) {
    console.error("[og] fetchTarget threw:", e);
    return c.json({ error: "fetch failed" }, 502);
  }

  if (!res.ok) return c.json({ error: `upstream ${res.status}` }, 502);

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
    // Non-HTML (image, pdf, etc.). Give back a minimal preview so the chip
    // can at least render the URL + content-type.
    const minimal: OgPreview = {
      url: url.toString(),
      finalUrl: res.url || url.toString(),
      title: null,
      description: null,
      image: null,
      siteName: url.hostname,
      favicon: null,
    };
    const out = Response.json(minimal, {
      headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
    });
    await cache.put(cacheKey, out.clone());
    return out;
  }

  const meta = await parseOg(res, url);
  const finalUrl = res.url || url.toString();
  const preview: OgPreview = {
    url: url.toString(),
    finalUrl,
    title: meta.title ?? null,
    description: meta.description ?? null,
    image: absolutize(meta.image, finalUrl),
    siteName: meta.siteName ?? url.hostname,
    favicon: absolutize(meta.favicon ?? "/favicon.ico", finalUrl),
  };

  const out = Response.json(preview, {
    headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
  });
  await cache.put(cacheKey, out.clone());
  return out;
});

/**
 * Reject anything that could turn this endpoint into an SSRF probe:
 *  - non-https schemes (http allowed only for development convenience —
 *    tighten if you ever ship to public sharing)
 *  - hostnames that look like loopback / private / link-local IP literals
 *  - .localhost, .internal, .local
 * Workers don't have access to internal networks anyway, but defense in
 * depth is cheap.
 */
function validateUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  // URL.hostname keeps brackets on IPv6 literals; strip them before checks.
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return null;
  }
  // IPv4 literals: block private ranges
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 169) {
      return null;
    }
  }
  // IPv6 literals: block obvious loopback / link-local / unique-local
  if (host.includes(":")) {
    if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
      return null;
    }
  }
  return u;
}

async function fetchTarget(url: URL): Promise<Response> {
  return fetch(url, {
    headers: {
      "user-agent": "InklingBot/1.0 (+https://inkling.page)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

type RawMeta = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
};

async function parseOg(res: Response, _url: URL): Promise<RawMeta> {
  // Cap parsed body. We only need <head>, which is almost always within
  // the first 64KB; reading much beyond that is wasted bytes and CPU.
  const html = await readBodyCapped(res, MAX_RESPONSE_BYTES);
  const head = extractHead(html);
  return parseHead(head);
}

async function readBodyCapped(res: Response, max: number): Promise<string> {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let out = "";
  while (received < max) {
    const { value, done } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  try { reader.cancel(); } catch { /* ignore */ }
  return out;
}

function extractHead(html: string): string {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html.slice(0, 65536);
}

function parseHead(head: string): RawMeta {
  const meta: RawMeta = {};

  // Match <meta ...> tags (self-closing or not). Scan attributes inside.
  const tagRe = /<meta\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(head)) !== null) {
    const attrs = m[1];
    const property = readAttr(attrs, "property")?.toLowerCase();
    const name = readAttr(attrs, "name")?.toLowerCase();
    const content = readAttr(attrs, "content");
    if (!content) continue;
    if (property === "og:title" && !meta.title) meta.title = content;
    else if (property === "og:description" && !meta.description) meta.description = content;
    else if (property === "og:image" && !meta.image) meta.image = content;
    else if (property === "og:site_name" && !meta.siteName) meta.siteName = content;
    else if (name === "twitter:title" && !meta.title) meta.title = content;
    else if (name === "twitter:description" && !meta.description) meta.description = content;
    else if (name === "twitter:image" && !meta.image) meta.image = content;
    else if (name === "description" && !meta.description) meta.description = content;
  }

  if (!meta.title) {
    const t = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) meta.title = decodeEntities(t[1]).trim();
  }

  const link = head.match(/<link\b[^>]*rel=["'][^"']*\bicon\b[^"']*["'][^>]*>/i);
  if (link) {
    const href = readAttr(link[0], "href");
    if (href) meta.favicon = href;
  }

  // Decode HTML entities in extracted strings.
  if (meta.title) meta.title = decodeEntities(meta.title);
  if (meta.description) meta.description = decodeEntities(meta.description);
  if (meta.siteName) meta.siteName = decodeEntities(meta.siteName);
  return meta;
}

function readAttr(attrs: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = attrs.match(re);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function absolutize(href: string | null | undefined, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
