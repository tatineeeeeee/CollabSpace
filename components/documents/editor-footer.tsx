"use client";

interface EditorFooterProps {
  wordCount: number;
  saveStatus: "saved" | "saving" | "unsaved";
}

export function EditorFooter({ wordCount, saveStatus }: EditorFooterProps) {
  return (
    <div className="flex items-center justify-between px-10 py-2 text-xs text-muted-foreground select-none md:px-16">
      <span>
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </span>
      <span>
        {saveStatus === "saving" && "Saving..."}
        {saveStatus === "saved" && "Saved"}
        {saveStatus === "unsaved" && "Unsaved changes"}
      </span>
    </div>
  );
}
