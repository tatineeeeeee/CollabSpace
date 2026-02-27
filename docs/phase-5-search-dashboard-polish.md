# Phase 5 — Search, Dashboard & Polish

**Goal:** Global search (Cmd+K), activity feed, loading states, empty states, dark mode.

---

## Step 1: Search Command Dialog (Cmd+K)

### `app/(main)/_components/search-command.tsx`

Uses shadcn `Command` component (already has `cmdk` installed).

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/hooks/use-debounce";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, Kanban } from "lucide-react";

// State: open (boolean), query (string)
// useDebounce(query, 300) for search input
//
// Keyboard shortcut:
// useEffect(() => {
//   const handleKeyDown = (e: KeyboardEvent) => {
//     if ((e.metaKey || e.ctrlKey) && e.key === "k") {
//       e.preventDefault();
//       setOpen(prev => !prev);
//     }
//   };
//   document.addEventListener("keydown", handleKeyDown);
//   return () => document.removeEventListener("keydown", handleKeyDown);
// }, []);
//
// Query documents and boards:
// const documents = useQuery(api.documents.search, { workspaceId, query: debouncedQuery });
// const boards = useQuery(api.boards.search, { workspaceId, query: debouncedQuery });
//
// On select: router.push to document/board, close dialog
//
// Layout:
// <CommandDialog open={open} onOpenChange={setOpen}>
//   <CommandInput placeholder="Search documents and boards..." />
//   <CommandList>
//     <CommandEmpty>No results found.</CommandEmpty>
//     <CommandGroup heading="Documents">
//       {documents?.map(doc => (
//         <CommandItem onSelect={() => navigate(`/documents/${doc._id}`)}>
//           <FileText className="mr-2 h-4 w-4" />
//           {doc.title}
//         </CommandItem>
//       ))}
//     </CommandGroup>
//     <CommandGroup heading="Boards">
//       {boards?.map(board => (...))}
//     </CommandGroup>
//   </CommandList>
// </CommandDialog>
```

### Wire into the app

Add `<SearchCommand />` to the `AppShell` in `app/(main)/layout.tsx`.

Update the Search button in `sidebar.tsx` to open the search dialog:

```tsx
// Create a zustand store or use a simple callback:
// Option A: zustand store for search open state
// Option B: fire a custom keyboard event (simpler)
onClick={() => {
  // Dispatch Ctrl+K to trigger the search dialog
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
}}
```

---

## Step 2: Activity Feed

### `convex/activities.ts`

```ts
// Functions:
// 1. log(userId, workspaceId, type, entityId, entityTitle, metadata?) → insert activity
//    - This should be called from other mutations (documents.create, boards.create, etc.)
//    - Consider making this an internal mutation called from other mutations
//
// 2. getRecent(workspaceId, limit?) → last N activities for workspace
//    - Use "by_workspace_recent" index
//    - Default limit: 20
//    - Join with users table to get user name/avatar
//    - Return: { ...activity, userName, userImageUrl }
```

### Activity logging

Add activity logging calls to existing mutations:
- `documents.ts`: create → "document_created", update → "document_updated", archive → "document_archived"
- `boards.ts`: create → "board_created", update → "board_updated"
- `cards.ts`: create → "card_created", move → "card_moved", update → "card_updated"

---

## Step 3: Dashboard Upgrade

### `app/(main)/dashboard/page.tsx`

Redesign from placeholder to full dashboard:

```tsx
// Layout: grid with widgets
// <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
//
// Widget 1: Recent Documents (span 1)
//   - useQuery(api.documents.getByWorkspace, { workspaceId })
//   - Show last 5 documents with icon, title, relative time
//   - Click → navigate to document
//   - "View all" link → /documents
//
// Widget 2: Recent Boards (span 1)
//   - useQuery(api.boards.getByWorkspace, { workspaceId })
//   - Show last 5 boards with icon, title
//   - Click → navigate to board
//   - "View all" link → /boards
//
// Widget 3: Activity Feed (span 1 or full width)
//   - useQuery(api.activities.getRecent, { workspaceId })
//   - Show activity items with avatar, action text, relative time
//   - "John created Document X" / "Jane moved Card Y to Done"
//
// Quick Actions bar at top:
//   - "New Document" button
//   - "New Board" button
```

---

## Step 4: Loading Skeletons

Create loading states for each page. Use shadcn `Skeleton` component.

### Pages that need skeletons:
- **Dashboard**: Card skeletons for widgets
- **Documents list**: Sidebar document tree skeleton
- **Document editor**: Title skeleton + editor area skeleton
- **Boards grid**: Card skeletons in grid
- **Kanban board**: Column skeletons with card placeholders

### Pattern:
```tsx
// In each page:
const data = useQuery(api.something.get, args);

if (data === undefined) {
  return <PageSkeleton />;  // Loading
}

if (data.length === 0) {
  return <EmptyState />;    // No data
}

return <ActualContent data={data} />;
```

---

## Step 5: Empty States

### `components/shared/empty-state.tsx`

```tsx
// Reusable empty state component
// Props: icon, title, description, action? (button label + onClick)
//
// <div className="flex flex-col items-center justify-center py-12">
//   <Icon className="h-12 w-12 text-muted-foreground/50" />
//   <h3 className="mt-4 text-lg font-medium">{title}</h3>
//   <p className="mt-1 text-sm text-muted-foreground">{description}</p>
//   {action && <Button className="mt-4" onClick={action.onClick}>{action.label}</Button>}
// </div>

// Usage examples:
// <EmptyState icon={FileText} title="No documents yet" description="Create your first document" action={{ label: "Create document", onClick: handleCreate }} />
// <EmptyState icon={Kanban} title="No boards yet" description="Create a board to get started" action={{ label: "Create board", onClick: handleCreate }} />
```

---

## Step 6: Dark Mode Toggle

Add a theme toggle to the sidebar or settings page.

```tsx
// In sidebar.tsx, near the UserButton area:
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const { theme, setTheme } = useTheme();

<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
>
  <Sun className="h-4 w-4 rotate-0 scale-100 transition dark:-rotate-90 dark:scale-0" />
  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition dark:rotate-0 dark:scale-100" />
</Button>
```

Ensure `ThemeProvider` wraps the app in root layout (should already be set up from Phase 1).

---

## Step 7: Toast Notifications

Verify all CRUD operations show toast feedback. Add missing toasts:

```tsx
// Pattern for mutations:
try {
  await createDocument({ title: "Untitled", workspaceId });
  toast.success("Document created");
} catch {
  toast.error("Failed to create document");
}
```

### Operations that need toasts:
- Document: create, archive, restore, delete
- Board: create, archive, restore, delete
- Card: create, move, archive, delete
- List: create, delete
- Workspace: create, update, delete (already done)

---

## Step 8: Mobile Responsive Polish

### Things to verify:
- Sidebar sheet works on mobile (already done)
- Kanban board has horizontal scroll on mobile
- Document editor is usable on mobile (editor toolbar wraps)
- Dashboard grid collapses to single column
- Search dialog is full-width on mobile
- All dialogs have proper mobile sizing (`sm:max-w-...`)

---

## Step 9: Error Boundaries

### `app/error.tsx` (root error boundary)

```tsx
"use client";
// Shows: "Something went wrong" with retry button
// Props: error, reset
// <div className="flex min-h-screen flex-col items-center justify-center gap-4">
//   <h2>Something went wrong</h2>
//   <Button onClick={reset}>Try again</Button>
// </div>
```

### `app/not-found.tsx`

```tsx
// Shows: "Page not found" with link back to dashboard
// <div className="flex min-h-screen flex-col items-center justify-center gap-4">
//   <h2>Page not found</h2>
//   <Link href="/dashboard">Go to Dashboard</Link>
// </div>
```

---

## File Creation Checklist

```
Create:
  ├── app/(main)/_components/search-command.tsx
  ├── convex/activities.ts
  ├── components/shared/empty-state.tsx
  ├── app/error.tsx
  └── app/not-found.tsx

Modify:
  ├── app/(main)/layout.tsx          (add SearchCommand)
  ├── app/(main)/_components/sidebar.tsx  (wire search button, add dark mode toggle)
  ├── app/(main)/dashboard/page.tsx  (full dashboard with widgets)
  ├── convex/documents.ts            (add activity logging)
  ├── convex/boards.ts               (add activity logging + search query)
  └── convex/cards.ts                (add activity logging)
```
