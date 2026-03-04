"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface AddListFormProps {
  boardId: Id<"boards">;
}

export function AddListForm({ boardId }: AddListFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createList = useMutation(api.lists.create);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      await createList({ title: title.trim(), boardId });
      setTitle("");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to create list");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setTitle("");
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => {
          setIsEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex h-10 w-72 shrink-0 items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add list
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-lg border bg-card p-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="List title..."
        className="h-8 text-sm"
        autoFocus
      />
      <div className="mt-2 flex items-center gap-1">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          Add list
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setIsEditing(false);
            setTitle("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
