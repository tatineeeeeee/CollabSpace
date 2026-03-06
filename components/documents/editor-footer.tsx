"use client";

import { formatRelativeTime } from "@/lib/utils";

interface EditorFooterProps {
  wordCount: number;
  saveStatus: "saved" | "saving" | "unsaved";
  lastEditedBy?: string;
  lastEditedAt?: number;
}

export function EditorFooter({ wordCount, saveStatus, lastEditedBy, lastEditedAt }: EditorFooterProps) {
  return (
    <div className="flex items-center justify-between px-10 py-2 text-xs text-muted-foreground select-none md:px-16">
      <div className="flex items-center gap-3">
        <span>
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        {lastEditedBy && lastEditedAt && (
          <span className="text-muted-foreground/70">
            Last edited by {lastEditedBy} {formatRelativeTime(lastEditedAt)}
          </span>
        )}
      </div>
      <span>
        {saveStatus === "saving" && "Saving..."}
        {saveStatus === "saved" && "Saved"}
        {saveStatus === "unsaved" && "Unsaved changes"}
      </span>
    </div>
  );
}
