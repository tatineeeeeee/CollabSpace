"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const fetchMetadata = action({
  args: { url: v.string() },
  handler: async (_, args) => {
    const { url } = args;

    // Validate URL
    if (url.length > 2048) {
      throw new Error("URL too long");
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Invalid URL");
    }

    if (parsed.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are supported");
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "CollabSpaceBot/1.0 (Link Preview)",
          Accept: "text/html",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return { url, title: null, description: null, favicon: null, image: null };
      }

      const html = await response.text();

      // Parse metadata from HTML
      const title =
        extractMeta(html, "og:title") ??
        extractMeta(html, "twitter:title") ??
        extractTag(html, "title");

      const description =
        extractMeta(html, "og:description") ??
        extractMeta(html, "twitter:description") ??
        extractMetaName(html, "description");

      const image =
        extractMeta(html, "og:image") ??
        extractMeta(html, "twitter:image");

      // Resolve relative image URL
      const resolvedImage = image ? resolveUrl(image, url) : null;

      // Extract favicon
      const faviconHref = extractFavicon(html);
      const favicon = faviconHref
        ? resolveUrl(faviconHref, url)
        : `${parsed.origin}/favicon.ico`;

      return {
        url,
        title: title?.slice(0, 500) ?? null,
        description: description?.slice(0, 500) ?? null,
        favicon,
        image: resolvedImage,
      };
    } catch {
      return { url, title: null, description: null, favicon: null, image: null };
    }
  },
});

function extractMeta(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  if (match) return decodeHtmlEntities(match[1]);

  // Try reversed attribute order
  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapeRegex(property)}["']`,
    "i"
  );
  const match2 = html.match(regex2);
  return match2 ? decodeHtmlEntities(match2[1]) : null;
}

function extractMetaName(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+name=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  if (match) return decodeHtmlEntities(match[1]);

  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegex(name)}["']`,
    "i"
  );
  const match2 = html.match(regex2);
  return match2 ? decodeHtmlEntities(match2[1]) : null;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractFavicon(html: string): string | null {
  const regex = /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i;
  const match = html.match(regex);
  if (match) return match[1];

  // Reversed order
  const regex2 = /<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i;
  const match2 = html.match(regex2);
  return match2 ? match2[1] : null;
}

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
