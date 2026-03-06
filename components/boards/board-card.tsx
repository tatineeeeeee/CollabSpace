"use client";

import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import type { AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlignLeft, Calendar, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

interface BoardCardProps {
  card: Doc<"cards">;
  onClick: () => void;
  isDragOverlay?: boolean;
  membersMap?: Map<string, { name: string; imageUrl?: string }>;
}

// Suppress layout animation during active sorting (cross-list moves)
// and right after dragging ends — prevents the snap-back visual
const cardAnimateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { wasDragging } = args;
  if (wasDragging) return false;
  return defaultAnimateLayoutChanges(args);
};

export function BoardCard({ card, onClick, isDragOverlay, membersMap }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card._id,
    data: { type: "card", card },
    animateLayoutChanges: cardAnimateLayoutChanges,
  });

  // Use Translate (position only) instead of Transform (includes scale)
  // to prevent visual artifacts when cards move between containers
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : (transition ?? "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)"),
  };

  const formattedDueDate = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const assignee = card.assigneeId ? membersMap?.get(card.assigneeId) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex cursor-grab flex-col rounded-lg border shadow-sm transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing",
        isDragging
          ? "rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 opacity-100 shadow-none *:invisible"
          : "bg-card",
        isDragOverlay && "cursor-grabbing rotate-2 shadow-xl ring-2 ring-primary/20"
      )}
    >
      {card.coverImage ? (
        <img
          src={card.coverImage}
          alt=""
          className="h-32 w-full rounded-t-md object-cover"
        />
      ) : card.coverColor ? (
        <div
          className="h-8 w-full rounded-t-md"
          style={{ backgroundColor: card.coverColor }}
        />
      ) : null}
      <div className="p-2.5" onClick={onClick}>
        <p className="text-sm font-medium leading-snug">{card.title}</p>

        {(card.labels?.length || card.description || formattedDueDate || (card.checklistItems && card.checklistItems.length > 0) || assignee) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {card.labels?.map((label, i) => (
              <Badge
                key={i}
                variant="outline"
                className="h-5 border-0 px-1.5 text-[10px] text-white"
                style={{
                  backgroundColor: label.color,
                }}
              >
                {label.name}
              </Badge>
            ))}
            {card.description && (
              <span className="flex items-center text-[11px] text-muted-foreground">
                <AlignLeft className="h-3 w-3" />
              </span>
            )}
            {card.checklistItems && card.checklistItems.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {card.checklistItems.filter((i) => i.completed).length}/
                {card.checklistItems.length}
              </span>
            )}
            {formattedDueDate && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formattedDueDate}
              </span>
            )}
            {assignee && (
              <Avatar className="ml-auto h-6 w-6 shrink-0">
                {assignee.imageUrl && <AvatarImage src={assignee.imageUrl} />}
                <AvatarFallback className="text-[10px]">
                  {assignee.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
