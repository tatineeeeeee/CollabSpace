"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Trash, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

const LABEL_COLORS = [
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Yellow", color: "#eab308" },
  { name: "Green", color: "#22c55e" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Purple", color: "#a855f7" },
  { name: "Pink", color: "#ec4899" },
];

interface CardDialogProps {
  card: Doc<"cards"> | null;
  onClose: () => void;
}

export function CardDialog({ card, onClose }: CardDialogProps) {
  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit card</DialogTitle>
        </DialogHeader>
        {card && (
          <CardDialogContent key={card._id} card={card} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardDialogContent({
  card,
  onClose,
}: {
  card: Doc<"cards">;
  onClose: () => void;
}) {
  const updateCard = useMutation(api.cards.update);
  const archiveCard = useMutation(api.cards.archive);

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>(
    card.labels ?? []
  );

  // Debounce description saves
  const debouncedDescription = useDebounce(description, 500);

  // Save description when debounced value changes
  if (debouncedDescription !== (card.description ?? "")) {
    updateCard({ id: card._id, description: debouncedDescription });
  }

  const handleTitleBlur = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== card.title) {
      await updateCard({ id: card._id, title: trimmed });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleToggleLabel = async (label: { name: string; color: string }) => {
    const exists = labels.some((l) => l.color === label.color);
    const newLabels = exists
      ? labels.filter((l) => l.color !== label.color)
      : [...labels, label];
    setLabels(newLabels);
    await updateCard({ id: card._id, labels: newLabels });
  };

  const handleArchive = async () => {
    try {
      await archiveCard({ id: card._id });
      toast.success("Card archived");
      onClose();
    } catch {
      toast.error("Failed to archive card");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        placeholder="Card title"
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="min-h-25 resize-none text-sm"
        />
      </div>

      {/* Labels */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Labels</Label>
        <div className="flex flex-wrap gap-1.5">
          {LABEL_COLORS.map((label) => {
            const isActive = labels.some((l) => l.color === label.color);
            return (
              <button
                key={label.color}
                onClick={() => handleToggleLabel(label)}
                className="relative"
              >
                <Badge
                  variant="outline"
                  className="h-6 cursor-pointer px-2 text-xs transition-all"
                  style={{
                    borderColor: label.color,
                    color: label.color,
                    backgroundColor: isActive
                      ? `${label.color}20`
                      : "transparent",
                  }}
                >
                  {label.name}
                  {isActive && <X className="ml-1 h-3 w-3" />}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end border-t pt-3">
        <ConfirmDialog
          onConfirm={handleArchive}
          title="Archive this card?"
          description="The card will be moved to trash."
          confirmLabel="Archive"
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash className="h-3.5 w-3.5" />
            Archive
          </Button>
        </ConfirmDialog>
      </div>
    </div>
  );
}
