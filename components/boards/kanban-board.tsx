"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { api } from "@/convex/_generated/api";
import { BoardList } from "./board-list";
import { BoardCard } from "./board-card";
import { AddListForm } from "./add-list-form";
import { CardDialog } from "./card-dialog";
import { BoardFilterBar, DEFAULT_FILTERS } from "./board-filter-bar";
import type { BoardFilters } from "./board-filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface KanbanBoardProps {
  boardId: Id<"boards">;
  workspaceId: Id<"workspaces">;
}

type DragItem =
  | { type: "list"; list: Doc<"lists"> }
  | { type: "card"; card: Doc<"cards"> };

export function KanbanBoard({ boardId, workspaceId }: KanbanBoardProps) {
  const lists = useQuery(api.lists.getByBoard, { boardId });
  const cards = useQuery(api.cards.getByBoard, { boardId });
  const reorderLists = useMutation(api.lists.reorder);
  const reorderCards = useMutation(api.cards.reorder);

  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [selectedCard, setSelectedCard] = useState<Doc<"cards"> | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);

  // Local state for optimistic card moves during drag
  const [localCardOverrides, setLocalCardOverrides] = useState<
    Map<string, Id<"lists">>
  >(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Sort lists by order
  const sortedLists = useMemo(() => {
    if (!lists) return [];
    return [...lists].sort((a, b) => a.order - b.order);
  }, [lists]);

  // Apply filters to cards (date boundaries computed outside useMemo to avoid impure calls)
  const now = Date.now();
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  const endOfWeekTs = endOfWeek.getTime();
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  const endOfMonthTs = endOfMonth.getTime();

  const filteredCards = useMemo(() => {
    if (!cards) return null;

    const hasFilters =
      filters.labelColors.length > 0 ||
      filters.assigneeIds.length > 0 ||
      filters.dueDateFilter !== "all";

    if (!hasFilters) return cards;

    return cards.filter((card) => {
      if (filters.labelColors.length > 0) {
        const cardColors = card.labels?.map((l) => l.color) ?? [];
        if (!filters.labelColors.some((c) => cardColors.includes(c))) return false;
      }
      if (filters.assigneeIds.length > 0) {
        if (!card.assigneeId || !filters.assigneeIds.includes(card.assigneeId))
          return false;
      }
      if (filters.dueDateFilter !== "all") {
        if (filters.dueDateFilter === "no_date") {
          if (card.dueDate) return false;
        } else if (!card.dueDate) {
          return false;
        } else {
          if (filters.dueDateFilter === "overdue" && card.dueDate >= now) return false;
          if (filters.dueDateFilter === "this_week" && card.dueDate > endOfWeekTs) return false;
          if (filters.dueDateFilter === "this_month" && card.dueDate > endOfMonthTs) return false;
        }
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, filters]);

  // Group cards by list, applying any local overrides
  const cardsByList = useMemo(() => {
    if (!filteredCards) return new Map<string, Doc<"cards">[]>();

    const map = new Map<string, Doc<"cards">[]>();

    // Initialize all lists (even empty ones)
    for (const list of sortedLists) {
      map.set(list._id, []);
    }

    for (const card of filteredCards) {
      const listId = localCardOverrides.get(card._id) ?? card.listId;
      const listIdStr = listId as string;
      const existing = map.get(listIdStr) ?? [];
      existing.push({ ...card, listId: listId as Id<"lists"> });
      map.set(listIdStr, existing);
    }

    // Sort cards by order within each list
    for (const [key, listCards] of map) {
      map.set(key, listCards.sort((a, b) => a.order - b.order));
    }

    return map;
  }, [filteredCards, sortedLists, localCardOverrides]);

  const listIds = sortedLists.map((l) => l._id);

  // --- Drag handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragItem | undefined;
    if (data) setActiveItem(data);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as DragItem | undefined;
    if (!activeData || activeData.type !== "card") return;

    const overData = over.data.current as DragItem | undefined;

    // Determine target list
    let targetListId: Id<"lists"> | null = null;

    if (overData?.type === "list") {
      targetListId = overData.list._id;
    } else if (overData?.type === "card") {
      // Get the overridden listId if it exists, otherwise use the card's original listId
      targetListId =
        localCardOverrides.get(overData.card._id) ?? overData.card.listId;
    }

    if (!targetListId) return;

    const currentListId =
      localCardOverrides.get(activeData.card._id) ?? activeData.card.listId;

    // Only update if moving to a different list
    if (currentListId !== targetListId) {
      setLocalCardOverrides((prev) => {
        const next = new Map(prev);
        next.set(activeData.card._id, targetListId);
        return next;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setLocalCardOverrides(new Map());

    if (!over || !lists || !cards) return;

    const activeData = active.data.current as DragItem | undefined;
    if (!activeData) return;

    if (activeData.type === "list") {
      // --- List reorder ---
      const oldIndex = sortedLists.findIndex((l) => l._id === active.id);
      const overData = over.data.current as DragItem | undefined;
      let newIndex: number;

      if (overData?.type === "list") {
        newIndex = sortedLists.findIndex((l) => l._id === over.id);
      } else {
        return;
      }

      if (oldIndex === newIndex) return;

      const reordered = arrayMove(sortedLists, oldIndex, newIndex);
      const items = reordered.map((l, i) => ({
        id: l._id,
        order: (i + 1) * 1000,
      }));

      await reorderLists({ items });
    } else if (activeData.type === "card") {
      // --- Card reorder / move ---
      const activeCardId = active.id as Id<"cards">;
      const activeCard = cards.find((c) => c._id === activeCardId);
      if (!activeCard) return;

      const overData = over.data.current as DragItem | undefined;

      // Determine target list
      let targetListId: Id<"lists">;
      if (overData?.type === "list") {
        targetListId = overData.list._id;
      } else if (overData?.type === "card") {
        // Use the over card's real listId from the server
        targetListId =
          localCardOverrides.get(overData.card._id) ?? overData.card.listId;
      } else {
        return;
      }

      // Get all cards in the target list (from the resolved cardsByList)
      const targetCards = (cardsByList.get(targetListId) ?? []).filter(
        (c) => c._id !== activeCardId
      );

      // Insert the active card at the right position
      let insertIndex = targetCards.length; // default: end

      if (overData?.type === "card" && overData.card._id !== activeCardId) {
        const overIndex = targetCards.findIndex(
          (c) => c._id === overData.card._id
        );
        if (overIndex >= 0) {
          insertIndex = overIndex;
        }
      }

      targetCards.splice(insertIndex, 0, activeCard);

      const items = targetCards.map((c, i) => ({
        id: c._id,
        listId: targetListId,
        order: (i + 1) * 1000,
      }));

      await reorderCards({ items });
    }
  };

  // Loading
  if (lists === undefined || cards === undefined) {
    return (
      <div className="flex gap-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0">
            <Skeleton className="h-10 w-full rounded-t-lg" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <BoardFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        workspaceId={workspaceId}
        cards={cards ?? []}
      />
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={listIds}
            strategy={horizontalListSortingStrategy}
          >
            {sortedLists.map((list) => (
              <BoardList
                key={list._id}
                list={list}
                cards={cardsByList.get(list._id) ?? []}
                onCardClick={setSelectedCard}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeItem?.type === "list" && (
              <BoardList
                list={activeItem.list}
                cards={cardsByList.get(activeItem.list._id) ?? []}
                onCardClick={() => {}}
                isDragOverlay
              />
            )}
            {activeItem?.type === "card" && (
              <BoardCard
                card={activeItem.card}
                onClick={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>

        <AddListForm boardId={boardId} />
      </div>

      <CardDialog card={selectedCard} onClose={() => setSelectedCard(null)} workspaceId={workspaceId} />
    </>
  );
}
