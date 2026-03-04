"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Calendar, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

interface BoardCardProps {
  card: Doc<"cards">;
  onClick: () => void;
  isDragOverlay?: boolean;
}

export function BoardCard({ card, onClick, isDragOverlay }: BoardCardProps) {
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
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formattedDueDate = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-1.5 rounded-md border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        isDragOverlay && "rotate-2 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <p className="text-sm font-medium leading-snug">{card.title}</p>

        {(card.labels?.length || formattedDueDate) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {card.labels?.map((label, i) => (
              <Badge
                key={i}
                variant="outline"
                className="h-5 px-1.5 text-[10px]"
                style={{
                  borderColor: label.color,
                  color: label.color,
                }}
              >
                {label.name}
              </Badge>
            ))}
            {formattedDueDate && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formattedDueDate}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
