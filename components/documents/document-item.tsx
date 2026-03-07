"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Copy, FileText, MoreHorizontal, Plus, Star, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface DocumentItemProps {
  id: Id<"documents">;
  label: string;
  icon?: string;
  active?: boolean;
  level?: number;
  expanded?: boolean;
  isFavorited?: boolean;
  onExpand?: () => void;
  onCreate?: () => void;
  onArchive?: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onDuplicate?: (e: React.MouseEvent) => void;
}

export function DocumentItem({
  id,
  label,
  icon,
  active,
  level = 0,
  expanded,
  isFavorited,
  onExpand,
  onCreate,
  onArchive,
  onToggleFavorite,
  onDuplicate,
}: DocumentItemProps) {
  const router = useRouter();

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand?.();
  };

  const handleCreate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCreate?.();
  };

  return (
    <div
      onClick={() => router.push(`/documents/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/documents/${id}`);
        }
      }}
      role="button"
      tabIndex={0}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      className={cn(
        "group flex min-h-8 w-full cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-muted-foreground transition-colors hover:bg-accent/50",
        active && "bg-accent text-accent-foreground"
      )}
    >
      <button
        onClick={handleExpand}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-accent"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            expanded && "rotate-90"
          )}
        />
      </button>

      <IconRenderer
        icon={icon ?? ""}
        className="mr-1 h-4 w-4 shrink-0 text-sm"
        fallback={<FileText className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      />

      <span className="truncate">{label}</span>

      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button aria-label="Document options" className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-accent">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" forceMount>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star className="mr-2 h-4 w-4" />
              {isFavorited ? "Remove from favorites" : "Add to favorites"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              <Trash className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={handleCreate}
          aria-label="Create sub-page"
          className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
