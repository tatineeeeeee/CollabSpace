"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { IconPicker } from "@/components/shared/icon-picker";
import { CoverPicker } from "@/components/documents/cover-image";
import { ImageIcon, Smile, X } from "lucide-react";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

interface DocumentToolbarProps {
  document: Doc<"documents">;
  isFullWidth?: boolean;
}

export function DocumentToolbar({ document, isFullWidth }: DocumentToolbarProps) {
  const update = useMutation(api.documents.update);

  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const title = localTitle ?? document.title;
  const hasCover = !!document.coverImage;

  const handleTitleSubmit = async () => {
    const trimmed = (localTitle ?? document.title).trim();
    setLocalTitle(null);
    if (trimmed !== document.title) {
      await update({ id: document._id, title: trimmed || "Untitled" });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSubmit();
      inputRef.current?.blur();
    }
  };

  const handleIconChange = async (icon: string) => {
    await update({ id: document._id, icon });
  };

  const handleRemoveIcon = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await update({ id: document._id, icon: "" });
  };

  const handleCoverChange = async (coverImage: string) => {
    await update({ id: document._id, coverImage });
  };

  return (
    <div className={cn("relative z-10 w-full px-6 md:px-16 lg:px-24", !hasCover && "pt-8")}>
      {/* Icon — large, overlaps cover when present */}
      {document.icon && (
        <div
          className={cn(
            "group/icon relative w-fit",
            hasCover ? "-mt-16" : "mt-0"
          )}
        >
          <IconPicker onChange={handleIconChange} onRemove={() => update({ id: document._id, icon: "" })} asChild>
            <button className="transition-opacity hover:opacity-80">
              <IconRenderer icon={document.icon!} className="h-30 w-30 text-[120px]" />
            </button>
          </IconPicker>
          <button
            onClick={handleRemoveIcon}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-muted opacity-0 shadow-sm transition-opacity group-hover/icon:opacity-100"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Title — large editable heading */}
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setLocalTitle(e.target.value)}
        onFocus={() => setLocalTitle(title)}
        onBlur={handleTitleSubmit}
        onKeyDown={handleTitleKeyDown}
        className={cn(
          "w-full bg-transparent text-5xl font-bold outline-none placeholder:text-muted-foreground/30",
          document.icon ? "mt-2" : hasCover ? "mt-6" : "mt-0"
        )}
        placeholder="Untitled"
      />

      {/* Action buttons — visible on hover of parent group */}
      <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!document.coverImage && (
          <CoverPicker onChange={handleCoverChange}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Add cover
            </Button>
          </CoverPicker>
        )}

        {!document.icon && (
          <IconPicker onChange={handleIconChange} asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <Smile className="h-3.5 w-3.5" />
              Add icon
            </Button>
          </IconPicker>
        )}
      </div>
    </div>
  );
}
