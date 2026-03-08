import { describe, it, expect } from "vitest";
import {
  isLucideIcon,
  isUrlIcon,
  isEmojiIcon,
  getLucideIconName,
} from "../icon-utils";

describe("isLucideIcon", () => {
  it("returns true for lucide: prefixed strings", () => {
    expect(isLucideIcon("lucide:heart")).toBe(true);
    expect(isLucideIcon("lucide:file-text")).toBe(true);
    expect(isLucideIcon("lucide:star")).toBe(true);
  });

  it("returns false for non-lucide strings", () => {
    expect(isLucideIcon("heart")).toBe(false);
    expect(isLucideIcon("https://example.com/icon.png")).toBe(false);
    expect(isLucideIcon("")).toBe(false);
  });
});

describe("isUrlIcon", () => {
  it("returns true for https URLs", () => {
    expect(isUrlIcon("https://example.com/icon.png")).toBe(true);
    expect(isUrlIcon("https://cdn.example.com/path/to/icon.svg")).toBe(true);
  });

  it("returns true for http URLs", () => {
    expect(isUrlIcon("http://example.com/icon.png")).toBe(true);
  });

  it("returns false for non-URL strings", () => {
    expect(isUrlIcon("lucide:heart")).toBe(false);
    expect(isUrlIcon("ftp://example.com")).toBe(false);
    expect(isUrlIcon("")).toBe(false);
  });
});

describe("isEmojiIcon", () => {
  it("returns true for emoji characters", () => {
    expect(isEmojiIcon("🚀")).toBe(true);
    expect(isEmojiIcon("📝")).toBe(true);
    expect(isEmojiIcon("❤️")).toBe(true);
  });

  it("returns true for plain text (treated as emoji)", () => {
    expect(isEmojiIcon("hello")).toBe(true);
  });

  it("returns false for lucide icons", () => {
    expect(isEmojiIcon("lucide:heart")).toBe(false);
  });

  it("returns false for URL icons", () => {
    expect(isEmojiIcon("https://example.com/icon.png")).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(isEmojiIcon("")).toBe(false);
  });
});

describe("getLucideIconName", () => {
  it("strips the lucide: prefix", () => {
    expect(getLucideIconName("lucide:heart")).toBe("heart");
    expect(getLucideIconName("lucide:file-text")).toBe("file-text");
    expect(getLucideIconName("lucide:star")).toBe("star");
  });

  it("returns the original string if no prefix", () => {
    expect(getLucideIconName("heart")).toBe("heart");
  });
});
