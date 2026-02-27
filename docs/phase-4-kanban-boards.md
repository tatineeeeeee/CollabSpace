# Phase 4 — Kanban Boards (Trello-style Drag & Drop)

**Goal:** Boards with draggable columns and cards using @dnd-kit.

---

## Step 1: Install @dnd-kit

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Step 2: Create Backend Functions

### `convex/boards.ts`

```ts
// Functions:
// 1. create(title, workspaceId) → creates board, logs activity
// 2. getByWorkspace(workspaceId) → non-archived boards for workspace
// 3. getById(id) → single board with membership check
// 4. update(id, title?, icon?, description?) → patch board
// 5. archive(id) → soft delete board + all its lists and cards
// 6. restore(id) → unarchive board + its lists and cards
// 7. remove(id) → permanent delete (only if archived)
```

### `convex/lists.ts`

```ts
// Functions:
// 1. create(title, boardId) → creates list with order = max(existing) + 1
// 2. getByBoard(boardId) → all lists for a board, sorted by order
// 3. update(id, title?) → rename list
// 4. reorder(boardId, listIds: Id<"lists">[]) → reorder all lists
//    - Takes the full ordered array of list IDs
//    - Sets order = index for each list
// 5. archive(id) → soft delete list + all its cards
// 6. remove(id) → permanent delete
```

### `convex/cards.ts`

```ts
// Functions:
// 1. create(title, listId, boardId) → create card with order = max(existing) + 1
// 2. getByBoard(boardId) → all non-archived cards for a board (use "by_board" index)
// 3. getByList(listId) → cards for a single list, sorted by order
// 4. update(id, title?, description?, labels?, dueDate?, assigneeId?) → patch card
// 5. move(id, targetListId, newOrder) → move card to different list + reorder
//    - Update listId and order on the moved card
//    - Reorder remaining cards in source and target lists
// 6. reorder(listId, cardIds: Id<"cards">[]) → reorder cards within a list
// 7. archive(id) → soft delete card
// 8. remove(id) → permanent delete
```

---

## Step 3: Board Grid Page

### `app/(main)/boards/page.tsx`

Update existing placeholder:

```tsx
// Shows grid of board cards for active workspace
// Uses: useQuery(api.boards.getByWorkspace, { workspaceId })
// Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
// Each card: title, icon, description preview, "Created X days ago"
// Click → navigate to /boards/[boardId]
// "Create board" button + empty state
```

### `components/boards/board-card.tsx`

```tsx
// Card component for the boards grid
// Props: board (from query)
// Shows: icon, title, description snippet, createdAt relative time
// Hover: subtle shadow/border effect
// Click: router.push(`/boards/${board._id}`)
```

---

## Step 4: Kanban Board Page

### `app/(main)/boards/[boardId]/page.tsx`

```tsx
"use client";
// Uses: useParams() to get boardId
// Uses: useQuery(api.boards.getById, { id: boardId })
// Uses: useQuery(api.lists.getByBoard, { boardId })
// Uses: useQuery(api.cards.getByBoard, { boardId })
//
// Layout: full-width, horizontal scroll for columns
// Shows: board title bar + <KanbanBoard> component
```

### `components/boards/kanban-board.tsx`

The main drag-and-drop wrapper:

```tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

// Props: lists, cards (grouped by listId), boardId
//
// State: activeCard (for DragOverlay), activeList
//
// Sensors:
//   const sensors = useSensors(
//     useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
//     useSensor(KeyboardSensor)
//   );
//
// DndContext handles:
//   onDragStart → set activeCard/activeList for overlay
//   onDragOver → handle card moving between columns (preview)
//   onDragEnd → call reorder/move mutations
//
// Layout:
//   <div className="flex gap-4 overflow-x-auto p-4">
//     <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
//       {lists.map(list => <KanbanColumn key={list._id} list={list} cards={cardsByList[list._id]} />)}
//     </SortableContext>
//     <AddColumn boardId={boardId} />
//   </div>
//   <DragOverlay>
//     {activeCard ? <KanbanCard card={activeCard} isOverlay /> : null}
//   </DragOverlay>
```

### `components/boards/kanban-column.tsx`

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

// Props: list, cards[]
// useSortable for column-level dragging (drag by header)
// SortableContext wraps cards for vertical sorting within column
//
// Layout:
//   <div className="w-72 shrink-0 rounded-lg bg-muted/50 p-2">
//     <div className="flex items-center justify-between px-2 py-1.5">
//       <h3>{list.title}</h3>
//       <span className="text-xs text-muted-foreground">{cards.length}</span>
//     </div>
//     <div className="flex flex-col gap-2">
//       {cards.map(card => <KanbanCard key={card._id} card={card} />)}
//     </div>
//     <AddCard listId={list._id} boardId={list.boardId} />
//   </div>
```

### `components/boards/kanban-card.tsx`

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Props: card, isOverlay?
// useSortable for card-level dragging
//
// const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
//   id: card._id,
//   data: { type: "card", card },
// });
//
// const style = { transform: CSS.Transform.toString(transform), transition };
//
// Layout:
//   <div ref={setNodeRef} style={style} {...attributes} {...listeners}
//     className={cn("rounded-md border bg-card p-3 shadow-sm", isDragging && "opacity-50")}
//   >
//     <p className="text-sm font-medium">{card.title}</p>
//     {card.labels && <div className="flex gap-1 mt-2">...label badges...</div>}
//     {card.dueDate && <span className="text-xs text-muted-foreground">Due: ...</span>}
//   </div>
//
// Click (not drag) → open CardDetailDialog
```

---

## Step 5: Inline Forms

### `components/boards/add-column.tsx`

```tsx
// Inline form to add a new list/column
// States: viewing (show "+ Add list" button) → editing (show input + Save/Cancel)
// On save: call create mutation, reset input
```

### `components/boards/add-card.tsx`

```tsx
// Inline form at bottom of each column to add a card
// States: viewing (show "+ Add card" button) → editing (show textarea + Add/Cancel)
// On save: call create mutation, reset
```

---

## Step 6: Card Detail Dialog

### `components/boards/card-detail-dialog.tsx`

```tsx
// Full card editing in a dialog/sheet
// Uses shadcn Dialog or Sheet
// Sections:
//   - Title (editable inline)
//   - Description (textarea or mini rich text)
//   - Labels (color picker + name)
//   - Due Date (date picker using shadcn Calendar)
//   - Assignee (member dropdown)
//   - Actions: Archive, Delete
//
// All changes call update mutation immediately (no save button — auto-save on blur)
```

### `components/boards/label-picker.tsx`

```tsx
// Predefined color palette (8-10 colors)
// User types label name + picks color
// Renders as small colored badges on cards
```

### `components/boards/member-assign.tsx`

```tsx
// Dropdown showing workspace members
// Uses: useQuery to get workspaceMembers for the board's workspace
// Select a member → calls update mutation with assigneeId
```

---

## Drag & Drop Logic (Key Algorithm)

```ts
// onDragEnd handler:
function handleDragEnd(event) {
  const { active, over } = event;
  if (!over) return;

  const activeData = active.data.current;
  const overData = over.data.current;

  // Case 1: Reordering columns
  if (activeData.type === "column" && overData.type === "column") {
    const oldIndex = lists.findIndex(l => l._id === active.id);
    const newIndex = lists.findIndex(l => l._id === over.id);
    const reordered = arrayMove(lists, oldIndex, newIndex);
    reorderLists({ boardId, listIds: reordered.map(l => l._id) });
  }

  // Case 2: Reordering cards within same column
  if (activeData.type === "card" && overData.type === "card") {
    if (activeData.card.listId === overData.card.listId) {
      // Same column reorder
      const columnCards = cardsByList[activeData.card.listId];
      const oldIndex = columnCards.findIndex(c => c._id === active.id);
      const newIndex = columnCards.findIndex(c => c._id === over.id);
      const reordered = arrayMove(columnCards, oldIndex, newIndex);
      reorderCards({ listId: activeData.card.listId, cardIds: reordered.map(c => c._id) });
    }
  }

  // Case 3: Moving card to different column
  // (handled in onDragOver for live preview, confirmed in onDragEnd)
  if (activeData.type === "card" && activeData.card.listId !== targetListId) {
    moveCard({ id: active.id, targetListId, newOrder });
  }
}
```

---

## File Creation Checklist

```
Create:
  ├── convex/boards.ts
  ├── convex/lists.ts
  ├── convex/cards.ts
  ├── components/boards/board-card.tsx
  ├── components/boards/kanban-board.tsx
  ├── components/boards/kanban-column.tsx
  ├── components/boards/kanban-card.tsx
  ├── components/boards/add-column.tsx
  ├── components/boards/add-card.tsx
  ├── components/boards/card-detail-dialog.tsx
  ├── components/boards/label-picker.tsx
  ├── components/boards/member-assign.tsx
  └── app/(main)/boards/[boardId]/page.tsx

Modify:
  └── app/(main)/boards/page.tsx  (update from placeholder to board grid)
```
