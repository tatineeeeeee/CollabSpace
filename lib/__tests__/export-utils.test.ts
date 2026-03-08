import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "../export-utils";

describe("sanitizeFilename", () => {
  it("removes dangerous characters", () => {
    expect(sanitizeFilename('my<file>name.txt')).toBe("myfilename.txt");
    expect(sanitizeFilename('file:name')).toBe("filename");
    expect(sanitizeFilename('file"name')).toBe("filename");
    expect(sanitizeFilename("file/name")).toBe("filename");
    expect(sanitizeFilename("file\\name")).toBe("filename");
    expect(sanitizeFilename("file|name")).toBe("filename");
    expect(sanitizeFilename("file?name")).toBe("filename");
    expect(sanitizeFilename("file*name")).toBe("filename");
  });

  it("preserves safe characters", () => {
    expect(sanitizeFilename("My Document (1)")).toBe("My Document (1)");
    expect(sanitizeFilename("project-notes_v2")).toBe("project-notes_v2");
    expect(sanitizeFilename("report.2026.final")).toBe("report.2026.final");
  });

  it("returns 'untitled' for empty or all-dangerous input", () => {
    expect(sanitizeFilename("")).toBe("untitled");
    expect(sanitizeFilename("<>:\"/\\|?*")).toBe("untitled");
    expect(sanitizeFilename("   ")).toBe("untitled");
  });

  it("trims whitespace", () => {
    expect(sanitizeFilename("  hello  ")).toBe("hello");
  });

  it("removes control characters", () => {
    expect(sanitizeFilename("file\x00name\x1f")).toBe("filename");
  });
});
