"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Trash, X, CalendarIcon, User, Plus, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const LABEL_COLORS = [
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Yellow", color: "#eab308" },
  { name: "Green", color: "#22c55e" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Purple", color: "#a855f7" },
  { name: "Pink", color: "#ec4899" },
];

const COVER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#6366f1", "#64748b",
];

interface CardDialogProps {
  card: Doc<"cards"> | null;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
}

export function CardDialog({ card, onClose, workspaceId }: CardDialogProps) {
  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit card</DialogTitle>
        </DialogHeader>
        {card && (
          <CardDialogContent
            key={card._id}
            card={card}
            onClose={onClose}
            workspaceId={workspaceId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardDialogContent({
  card,
  onClose,
  workspaceId,
}: {
  card: Doc<"cards">;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
}) {
  const updateCard = useMutation(api.cards.update);
  const archiveCard = useMutation(api.cards.archive);
  const members = useQuery(api.workspaces.getMembers, { workspaceId });

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>(
    card.labels ?? []
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    card.dueDate ? new Date(card.dueDate) : undefined
  );
  const [checklistItems, setChecklistItems] = useState<
    Array<{ id: string; text: string; completed: boolean }>
  >(card.checklistItems ?? []);
  const [coverColor, setCoverColor] = useState<string | undefined>(
    card.coverColor
  );

  // Debounce description saves
  const debouncedDescription = useDebounce(description, 500);

  useEffect(() => {
    if (debouncedDescription !== (card.description ?? "")) {
      updateCard({ id: card._id, description: debouncedDescription });
    }
  }, [debouncedDescription, card._id, card.description, updateCard]);

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

  const handleDueDateSelect = async (date: Date | undefined) => {
    setDueDate(date);
    await updateCard({
      id: card._id,
      dueDate: date ? date.getTime() : undefined,
    });
  };

  const handleAssign = async (userId: Id<"users"> | undefined) => {
    await updateCard({ id: card._id, assigneeId: userId });
  };

  const handleAddChecklistItem = () => {
    const newItem = { id: crypto.randomUUID(), text: "", completed: false };
    const newItems = [...checklistItems, newItem];
    setChecklistItems(newItems);
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    const newItems = checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklistItems(newItems);
    await updateCard({ id: card._id, checklistItems: newItems });
  };

  const handleUpdateChecklistItemText = async (itemId: string, text: string) => {
    const newItems = checklistItems.map((item) =>
      item.id === itemId ? { ...item, text } : item
    );
    setChecklistItems(newItems);
    await updateCard({ id: card._id, checklistItems: newItems });
  };

  const handleRemoveChecklistItem = async (itemId: string) => {
    const newItems = checklistItems.filter((item) => item.id !== itemId);
    setChecklistItems(newItems);
    await updateCard({ id: card._id, checklistItems: newItems });
  };

  const handleCoverColor = async (color: string | undefined) => {
    setCoverColor(color);
    await updateCard({ id: card._id, coverColor: color ?? "" });
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

  const currentAssignee = members?.find(
    (m) => m && m.userId === card.assigneeId
  );

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

      {/* Cover Color */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Cover color</Label>
        <div className="flex flex-wrap gap-1.5">
          {COVER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={`Set cover color ${color}`}
              onClick={() => handleCoverColor(color)}
              className={cn(
                "h-6 w-6 rounded-md border-2 transition-all",
                coverColor === color
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          {coverColor && (
            <button
              type="button"
              title="Remove cover color"
              onClick={() => handleCoverColor(undefined)}
              className="flex h-6 w-6 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Checklist</Label>
          {checklistItems.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {checklistItems.filter((i) => i.completed).length}/
              {checklistItems.length}
            </span>
          )}
        </div>
        {checklistItems.length > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${
                  (checklistItems.filter((i) => i.completed).length /
                    checklistItems.length) *
                  100
                }%`,
              }}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => handleToggleChecklistItem(item.id)}
              />
              <input
                defaultValue={item.text}
                placeholder="New item..."
                onBlur={(e) =>
                  handleUpdateChecklistItemText(item.id, e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className={cn(
                  "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                  item.completed && "text-muted-foreground line-through"
                )}
              />
              <button
                type="button"
                title="Remove item"
                onClick={() => handleRemoveChecklistItem(item.id)}
                className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5"
          onClick={handleAddChecklistItem}
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </Button>
      </div>

      {/* Due Date */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Due date</Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-fit gap-2 text-sm font-normal"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dueDate ? format(dueDate, "MMM d, yyyy") : "Set due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={handleDueDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {dueDate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleDueDateSelect(undefined)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Assignee</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-2 text-sm font-normal"
            >
              {currentAssignee ? (
                <>
                  <Avatar className="h-5 w-5">
                    {currentAssignee.imageUrl && (
                      <AvatarImage src={currentAssignee.imageUrl} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {currentAssignee.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {currentAssignee.name}
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5" />
                  Assign member
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {members?.map(
              (m) =>
                m && (
                  <DropdownMenuItem
                    key={m.userId}
                    onSelect={() => handleAssign(m.userId as Id<"users">)}
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      {m.imageUrl && <AvatarImage src={m.imageUrl} />}
                      <AvatarFallback className="text-[10px]">
                        {m.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {m.name}
                  </DropdownMenuItem>
                )
            )}
            {card.assigneeId && (
              <DropdownMenuItem onSelect={() => handleAssign(undefined)}>
                <X className="mr-2 h-3.5 w-3.5" />
                Remove assignee
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
