"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconPicker } from "@/components/shared/icon-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ArrowLeft, Menu, MoreHorizontal, Smile, Trash, X } from "lucide-react";
import { useSidebarStore } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

interface BoardHeaderProps {
  board: Doc<"boards">;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const router = useRouter();
  const update = useMutation(api.boards.update);
  const archive = useMutation(api.boards.archive);

  const { setMobileOpen } = useSidebarStore();

  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localDesc, setLocalDesc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const title = localTitle ?? board.title;
  const description = localDesc ?? (board.description ?? "");

  const handleTitleSubmit = async () => {
    const trimmed = (localTitle ?? board.title).trim();
    setLocalTitle(null);
    if (trimmed !== board.title) {
      await update({ id: board._id, title: trimmed || "Untitled Board" });
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
    await update({ id: board._id, icon });
  };

  const handleRemoveIcon = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await update({ id: board._id, icon: "" });
  };

  const handleDescSubmit = async () => {
    const trimmed = (localDesc ?? (board.description ?? "")).trim();
    setLocalDesc(null);
    if (trimmed !== (board.description ?? "")) {
      await update({ id: board._id, description: trimmed });
    }
  };

  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDescSubmit();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleArchive = async () => {
    try {
      await archive({ id: board._id });
      toast.success("Board archived");
      router.push("/boards");
    } catch {
      toast.error("Failed to archive board");
    }
  };

  return (
    <div className="flex flex-col border-b">
      <div className="flex items-center gap-3 px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => router.push("/boards")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

      {/* Icon */}
      {board.icon ? (
        <div className="group/icon relative">
          <IconPicker onChange={handleIconChange} asChild>
            <button className="text-xl transition-opacity hover:opacity-80">
              {board.icon}
            </button>
          </IconPicker>
          <button
            onClick={handleRemoveIcon}
            title="Remove icon"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted opacity-0 shadow-sm transition-opacity group-hover/icon:opacity-100"
          >
            <X className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <IconPicker onChange={handleIconChange} asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </IconPicker>
      )}

      {/* Title */}
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setLocalTitle(e.target.value)}
        onFocus={() => setLocalTitle(title)}
        onBlur={handleTitleSubmit}
        onKeyDown={handleTitleKeyDown}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/50"
        )}
        placeholder="Untitled Board"
      />

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ConfirmDialog
            onConfirm={handleArchive}
            title="Archive this board?"
            description="The board and all its lists and cards will be moved to trash."
            confirmLabel="Archive"
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Trash className="mr-2 h-4 w-4" />
              Archive board
            </DropdownMenuItem>
          </ConfirmDialog>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      <div className="px-4 pb-2">
        <input
          value={description}
          onChange={(e) => setLocalDesc(e.target.value)}
          onFocus={() => setLocalDesc(description)}
          onBlur={handleDescSubmit}
          onKeyDown={handleDescKeyDown}
          className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50"
          placeholder="Add a description..."
        />
      </div>
    </div>
  );
}
