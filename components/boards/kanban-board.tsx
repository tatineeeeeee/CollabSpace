"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCenter,
  getFirstCollision,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  CollisionDetection,
  UniqueIdentifier,
  DropAnimation,
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
  hasBackground?: boolean;
}

type DragItem =
  | { type: "list"; list: Doc<"lists"> }
  | { type: "card"; card: Doc<"cards"> };

// Drop animation matching the official dnd-kit example
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

export function KanbanBoard({ boardId, workspaceId, hasBackground }: KanbanBoardProps) {
  const lists = useQuery(api.lists.getByBoard, { boardId });
  const cards = useQuery(api.cards.getByBoard, { boardId });
  const members = useQuery(api.workspaces.getMembers, { workspaceId });

  // Build a map for quick member lookups by userId
  const membersMap = (() => {
    if (!members) return new Map<string, { name: string; imageUrl?: string }>();
    const map = new Map<string, { name: string; imageUrl?: string }>();
    for (const m of members) {
      if (m) map.set(m.userId, { name: m.name, imageUrl: m.imageUrl });
    }
    return map;
  })();
  const reorderLists = useMutation(api.lists.reorder);
  const reorderCards = useMutation(api.cards.reorder);

  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [selectedCard, setSelectedCard] = useState<Doc<"cards"> | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);

  // Full local copy of cards during drag — null means use server data
  const [localCards, setLocalCards] = useState<Doc<"cards">[] | null>(null);

  // Sticky collision ref — caches last valid overId (official dnd-kit pattern)
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  // Track cross-container moves to disable drop animation (prevents snap-back)
  // Must be state (not ref) so DragOverlay reads the correct value during render
  const [movedToNewList, setMovedToNewList] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Sort lists by order
  const sortedLists = lists ? [...lists].sort((a, b) => a.order - b.order) : [];
  const listIdSet = new Set(sortedLists.map((l) => l._id as string));

  // Date boundaries for due-date filtering (useState initializer is pure)
  const [dateBounds] = useState(() => {
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return { now: Date.now(), endOfWeekTs: endOfWeek.getTime(), endOfMonthTs: endOfMonth.getTime() };
  });

  // Apply filters to cards
  const filteredCards = (() => {
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
          if (filters.dueDateFilter === "overdue" && card.dueDate >= dateBounds.now) return false;
          if (filters.dueDateFilter === "this_week" && card.dueDate > dateBounds.endOfWeekTs) return false;
          if (filters.dueDateFilter === "this_month" && card.dueDate > dateBounds.endOfMonthTs) return false;
        }
      }
      return true;
    });
  })();

  // Use local cards during drag, server data otherwise
  const cardsForGrouping = localCards ?? filteredCards;

  // Group cards by list
  const cardsByList = (() => {
    if (!cardsForGrouping) return new Map<string, Doc<"cards">[]>();

    const map = new Map<string, Doc<"cards">[]>();

    // Initialize all lists (even empty ones)
    for (const list of sortedLists) {
      map.set(list._id, []);
    }

    for (const card of cardsForGrouping) {
      const existing = map.get(card.listId as string) ?? [];
      existing.push(card);
      map.set(card.listId as string, existing);
    }

    // Sort cards by order within each list
    for (const [key, listCards] of map) {
      map.set(key, listCards.sort((a, b) => a.order - b.order));
    }

    return map;
  })();

  const listIds = sortedLists.map((l) => l._id);

  /**
   * Official dnd-kit multi-container collision detection strategy.
   * Source: https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx
   *
   * 1. If dragging a list → use closestCenter filtered to list containers only
   * 2. If dragging a card → use pointerWithin (triggers at list edge, not center!)
   * 3. If pointer hits a list container → drill down to find closest card inside
   * 4. Cache lastOverId for stability when pointer is between containers
   */
  // Reset recentlyMovedToNewContainer after one animation frame.
  // This is the official dnd-kit pattern — skip collision detection for exactly
  // one frame after a cross-container move to let the layout settle.
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [localCards]);

  // Clear optimistic local cards once server data reflects the mutation
  const onServerCardsUpdate = useEffectEvent(() => {
    if (localCards !== null && activeItem === null) {
      setLocalCards(null);
      setMovedToNewList(false);
    }
  });

  useEffect(() => {
    onServerCardsUpdate();
  }, [cards]);

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const activeData = args.active.data.current as DragItem | undefined;

      // If dragging a list, only check against other lists
      if (activeData?.type === "list") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => listIdSet.has(container.id as string)
          ),
        });
      }

      // CRITICAL: After a cross-container move, skip detection for one frame.
      // The pointer is still over the OLD list, so pointerWithin would snap
      // the card back. Return cached lastOverId instead until layout settles.
      if (recentlyMovedToNewContainer.current) {
        return lastOverId.current ? [{ id: lastOverId.current }] : [];
      }

      // For cards: use pointerWithin first (detects as soon as pointer enters a list)
      const pointerCollisions = pointerWithin(args);
      const collisions =
        pointerCollisions.length > 0
          ? pointerCollisions
          : rectIntersection(args);

      let overId = getFirstCollision(collisions, "id");

      if (overId != null) {
        // If we hit a list container, find the closest card within it
        if (listIdSet.has(overId as string)) {
          const containerCardIds = (cardsByList.get(overId as string) ?? []).map(
            (c) => c._id as string
          );
          if (containerCardIds.length > 0) {
            const closestCard = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) => containerCardIds.includes(container.id as string)
              ),
            })[0]?.id;
            if (closestCard) overId = closestCard;
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Return cached or empty
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [listIdSet, cardsByList]
  );

  // --- Drag handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragItem | undefined;
    if (data) setActiveItem(data);
    setMovedToNewList(false);

    // Snapshot current cards for optimistic manipulation during drag
    if (filteredCards) {
      setLocalCards([...filteredCards]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localCards) return;

    const activeData = active.data.current as DragItem | undefined;
    if (!activeData || activeData.type !== "card") return;

    const activeCardId = active.id as string;
    const activeCard = localCards.find((c) => c._id === activeCardId);
    if (!activeCard) return;

    const overData = over.data.current as DragItem | undefined;

    // Determine target list
    let targetListId: Id<"lists"> | null = null;

    if (overData?.type === "list") {
      targetListId = overData.list._id;
    } else if (overData?.type === "card") {
      const overCard = localCards.find((c) => c._id === over.id);
      targetListId = overCard?.listId ?? null;
    }

    if (!targetListId) return;

    // Only update if moving to a different list
    if (activeCard.listId === targetListId) return;

    recentlyMovedToNewContainer.current = true;
    setMovedToNewList(true);

    // Move card to the new list in local state
    setLocalCards((prev) => {
      if (!prev) return prev;
      return prev.map((c) =>
        c._id === activeCardId
          ? { ...c, listId: targetListId as Id<"lists"> }
          : c
      );
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    recentlyMovedToNewContainer.current = false;

    // Keep localCards alive for optimistic UI — cleared by useEffect when server catches up
    const finalLocalCards = localCards;

    if (!over || !lists || !cards) {
      setLocalCards(null);
      return;
    }

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

      // Determine target list from the final local state
      let targetListId: Id<"lists">;
      if (finalLocalCards) {
        const movedCard = finalLocalCards.find((c) => c._id === activeCardId);
        targetListId = movedCard?.listId ?? activeCard.listId;
      } else if (overData?.type === "list") {
        targetListId = overData.list._id;
      } else if (overData?.type === "card") {
        targetListId = overData.card.listId;
      } else {
        return;
      }

      // Build the final card order for the target list
      const targetListCards = finalLocalCards
        ? finalLocalCards
            .filter((c) => c.listId === targetListId && c._id !== activeCardId)
            .sort((a, b) => a.order - b.order)
        : (cardsByList.get(targetListId) ?? []).filter(
            (c) => c._id !== activeCardId
          );

      // Determine insert position
      let insertIndex = targetListCards.length;

      if (overData?.type === "card" && overData.card._id !== activeCardId) {
        const overIndex = targetListCards.findIndex(
          (c) => c._id === overData.card._id
        );
        if (overIndex >= 0) {
          insertIndex = overIndex;
        }
      }

      targetListCards.splice(insertIndex, 0, activeCard);

      const items = targetListCards.map((c, i) => ({
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
    <div className="flex h-full flex-col">
      <BoardFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        workspaceId={workspaceId}
        cards={cards ?? []}
      />
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          measuring={{
            droppable: { strategy: MeasuringStrategy.Always },
          }}
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
                membersMap={membersMap}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={movedToNewList ? null : dropAnimationConfig}>
            {activeItem?.type === "list" && (
              <BoardList
                list={activeItem.list}
                cards={cardsByList.get(activeItem.list._id) ?? []}
                onCardClick={() => {}}
                isDragOverlay
                membersMap={membersMap}
              />
            )}
            {activeItem?.type === "card" && (
              <BoardCard
                card={activeItem.card}
                onClick={() => {}}
                isDragOverlay
                membersMap={membersMap}
              />
            )}
          </DragOverlay>
        </DndContext>

        <AddListForm boardId={boardId} hasBackground={hasBackground} />
      </div>

      <CardDialog card={selectedCard} onClose={() => setSelectedCard(null)} workspaceId={workspaceId} />
    </div>
  );
}
