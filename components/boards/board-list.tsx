"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BoardCard } from "./board-card";
import { Check, GripVertical, MoreHorizontal, Palette, Plus, Trash, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIST_COLORS } from "@/lib/colors";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

interface BoardListProps {
  list: Doc<"lists">;
  cards: Doc<"cards">[];
  onCardClick: (card: Doc<"cards">) => void;
  isDragOverlay?: boolean;
  membersMap?: Map<string, { name: string; imageUrl?: string }>;
}

export function BoardList({
  list,
  cards,
  onCardClick,
  isDragOverlay,
  membersMap,
}: BoardListProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list._id,
    data: { type: "list", list },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)",
    ...(list.color ? { backgroundColor: `${list.color}30` } : {}),
  };

  const updateList = useMutation(api.lists.update);
  const removeList = useMutation(api.lists.remove);
  const createCard = useMutation(api.cards.create);

  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [addingCard, setAddingCard] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const cardInputRef = useRef<HTMLInputElement>(null);

  const displayTitle = localTitle ?? list.title;

  const handleTitleSubmit = async () => {
    const trimmed = (localTitle ?? list.title).trim();
    setLocalTitle(null);
    if (trimmed && trimmed !== list.title) {
      await updateList({ id: list._id, title: trimmed });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    }
  };

  const handleRemoveList = async () => {
    try {
      await removeList({ id: list._id });
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const handleAddCard = async () => {
    if (!cardTitle.trim()) return;
    try {
      await createCard({
        title: cardTitle.trim(),
        listId: list._id,
        boardId: list.boardId,
      });
      setCardTitle("");
      cardInputRef.current?.focus();
    } catch {
      toast.error("Failed to create card");
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCard();
    }
    if (e.key === "Escape") {
      setAddingCard(false);
      setCardTitle("");
    }
  };

  const cardIds = cards.map((c) => c._id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/list flex w-72 shrink-0 flex-col rounded-xl shadow-sm",
        !list.color && "bg-background/80 backdrop-blur-sm dark:bg-card/80",
        isDragging && "opacity-50",
        isDragOverlay && "rotate-2 shadow-xl"
      )}
    >

      {/* List header */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover/list:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <input
          ref={titleRef}
          value={displayTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onFocus={() => setLocalTitle(displayTitle)}
          onBlur={handleTitleSubmit}
          onKeyDown={handleTitleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          placeholder="List title"
        />

        <span className="mr-1 rounded-full bg-muted/50 px-1.5 text-[11px] text-muted-foreground">
          {cards.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setAddingCard(true);
                setTimeout(() => cardInputRef.current?.focus(), 0);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add card
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                Change list color
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-2">
                <div className="grid grid-cols-5 gap-1.5">
                  {LIST_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.value}
                      className="flex h-7 w-7 items-center justify-center rounded-md transition-transform hover:scale-110"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                      onClick={() =>
                        updateList({ id: list._id, color: c.value })
                      }
                    >
                      {list.color === c.value && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
                {list.color && (
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                    onClick={() => updateList({ id: list._id, color: "" })}
                  >
                    <X className="h-3 w-3" />
                    Remove color
                  </button>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <ConfirmDialog
              onConfirm={handleRemoveList}
              title="Delete this list?"
              description="All cards in this list will be permanently deleted."
              confirmLabel="Delete"
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash className="mr-2 h-4 w-4" />
                Delete list
              </DropdownMenuItem>
            </ConfirmDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex max-h-[calc(100vh-220px)] min-h-[2px] flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCard
              key={card._id}
              card={card}
              onClick={() => onCardClick(card)}
              membersMap={membersMap}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add card — stop propagation so DndKit sensors don't swallow clicks */}
      <div className="p-2 pt-0" onPointerDown={(e) => e.stopPropagation()}>
        {addingCard ? (
          <div>
            <Input
              ref={cardInputRef}
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              onKeyDown={handleCardKeyDown}
              placeholder="Card title..."
              className="h-8 text-sm"
              autoFocus
            />
            <div className="mt-1.5 flex items-center gap-1">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddCard}
                disabled={!cardTitle.trim()}
              >
                Add card
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setAddingCard(false);
                  setCardTitle("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start gap-1.5 text-xs text-muted-foreground"
            onClick={() => {
              setAddingCard(true);
              setTimeout(() => cardInputRef.current?.focus(), 0);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add card
          </Button>
        )}
      </div>
    </div>
  );
}
