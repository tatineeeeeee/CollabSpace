import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isSafeCoverValue, formatFileSize, formatRelativeTime } from "../utils";

describe("isSafeCoverValue", () => {
  it("accepts https URLs", () => {
    expect(isSafeCoverValue("https://example.com/image.png")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isSafeCoverValue("http://example.com/image.png")).toBe(true);
  });

  it("accepts 3-digit hex colors", () => {
    expect(isSafeCoverValue("#fff")).toBe(true);
    expect(isSafeCoverValue("#ABC")).toBe(true);
  });

  it("accepts 6-digit hex colors", () => {
    expect(isSafeCoverValue("#ff5733")).toBe(true);
    expect(isSafeCoverValue("#AABBCC")).toBe(true);
  });

  it("accepts 8-digit hex colors (with alpha)", () => {
    expect(isSafeCoverValue("#ff573380")).toBe(true);
  });

  it("accepts CSS gradients", () => {
    expect(isSafeCoverValue("linear-gradient(to right, #ff5733, #33ff57)")).toBe(true);
    expect(isSafeCoverValue("radial-gradient(circle, red, blue)")).toBe(true);
    expect(isSafeCoverValue("conic-gradient(red, yellow, green)")).toBe(true);
  });

  it("accepts CSS color names", () => {
    expect(isSafeCoverValue("red")).toBe(true);
    expect(isSafeCoverValue("cornflowerblue")).toBe(true);
  });

  it("rejects javascript: protocol", () => {
    expect(isSafeCoverValue("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URIs", () => {
    expect(isSafeCoverValue("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects CSS expressions/injections", () => {
    expect(isSafeCoverValue("expression(alert(1))")).toBe(false);
    expect(isSafeCoverValue("url(javascript:alert(1))")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isSafeCoverValue("")).toBe(false);
  });

  it("rejects strings with spaces (potential injection)", () => {
    expect(isSafeCoverValue("red; background: url(evil)")).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 * 100)).toBe("100.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(1024 * 1024 * 5.5)).toBe("5.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    expect(formatFileSize(1024 * 1024 * 1024 * 2.3)).toBe("2.3 GB");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps within the last minute", () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe("just now");
    expect(formatRelativeTime(now - 30_000)).toBe("just now");
    expect(formatRelativeTime(now - 59_000)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 60_000)).toBe("1m ago");
    expect(formatRelativeTime(now - 5 * 60_000)).toBe("5m ago");
    expect(formatRelativeTime(now - 59 * 60_000)).toBe("59m ago");
  });

  it("returns hours ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 60 * 60_000)).toBe("1h ago");
    expect(formatRelativeTime(now - 12 * 60 * 60_000)).toBe("12h ago");
    expect(formatRelativeTime(now - 23 * 60 * 60_000)).toBe("23h ago");
  });

  it("returns days ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 24 * 60 * 60_000)).toBe("1d ago");
    expect(formatRelativeTime(now - 7 * 24 * 60 * 60_000)).toBe("7d ago");
    expect(formatRelativeTime(now - 29 * 24 * 60 * 60_000)).toBe("29d ago");
  });

  it("returns months ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 30 * 24 * 60 * 60_000)).toBe("1mo ago");
    expect(formatRelativeTime(now - 6 * 30 * 24 * 60 * 60_000)).toBe("6mo ago");
  });

  it("returns years ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 365 * 24 * 60 * 60_000)).toBe("1y ago");
    expect(formatRelativeTime(now - 2 * 365 * 24 * 60 * 60_000)).toBe("2y ago");
  });
});
