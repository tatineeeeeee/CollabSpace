# Phase 3 — Documents (Notion-style Rich Text Editor)

**Goal:** Nested documents with Tiptap rich text editing, sidebar tree, auto-save.

---

## Step 1: Install Tiptap + Extensions

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-placeholder @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-link @tiptap/extension-highlight @tiptap/extension-text-align @tiptap/extension-underline
```

---

## Step 2: Create `convex/documents.ts`

Backend functions for document CRUD. All functions must:
- Check auth via `ctx.auth.getUserIdentity()`
- Look up user via `by_clerk_id` index
- Verify workspace membership via `workspaceMembers` table

### Functions to implement:

```ts
// convex/documents.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. create — Create a new document
export const create = mutation({
  args: {
    title: v.string(),
    workspaceId: v.id("workspaces"),
    parentDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    // Auth check → get user → verify workspace membership
    // Insert document with: isArchived: false, isPublished: false,
    //   createdAt: Date.now(), updatedAt: Date.now()
    // Log activity: "document_created"
    // Return document ID
  },
});

// 2. getByWorkspace — Get all non-archived docs for a workspace (optionally filtered by parent)
export const getByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    parentDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    // Auth check → verify membership
    // Use "by_workspace_parent" index:
    //   q.eq("workspaceId", args.workspaceId)
    //    .eq("parentDocumentId", args.parentDocumentId)  ← undefined for root docs
    //    .eq("isArchived", false)
    // Return sorted by createdAt
  },
});

// 3. getById — Get a single document
export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Auth check → get doc → verify user is member of doc's workspace
    // Return document or null
  },
});

// 4. update — Update title, icon, coverImage
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auth check → verify membership → patch document
    // Set updatedAt: Date.now()
  },
});

// 5. updateContent — Separate mutation for editor content (called frequently)
export const updateContent = mutation({
  args: {
    id: v.id("documents"),
    content: v.string(), // Stringified Tiptap JSON
  },
  handler: async (ctx, args) => {
    // Auth check → verify membership → patch content + updatedAt
  },
});

// 6. archive — Soft delete (also archives all children recursively)
export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Auth check → verify membership
    // Set isArchived: true on this doc
    // Recursively archive children:
    //   const children = await ctx.db.query("documents")
    //     .withIndex("by_parent", q => q.eq("parentDocumentId", args.id))
    //     .collect();
    //   for (const child of children) { recurse }
    // Log activity: "document_archived"
  },
});

// 7. restore — Unarchive a document (and restore parent chain if needed)
export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Auth check → verify membership
    // Set isArchived: false
    // If parent is archived, either restore parent chain or move to root (parentDocumentId: undefined)
    // Recursively restore children
  },
});

// 8. remove — Permanently delete (only archived docs)
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Auth check → verify membership
    // Verify doc is archived before allowing permanent delete
    // Delete the document
  },
});

// 9. search — Search documents by title within a workspace
export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Auth check → verify membership
    // Use searchIndex or filter by_workspace where title contains query
    // Return non-archived matches (limit to ~20)
  },
});

// 10. getArchived — Get all archived docs for trash view
export const getArchived = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // Auth check → verify membership
    // Use "by_workspace_archived" index with isArchived: true
  },
});
```

---

## Step 3: Build Sidebar Document Tree

### `components/documents/document-list.tsx`
Recursive component that renders documents at a given nesting level.

```tsx
// Props: workspaceId, parentDocumentId (optional), level (nesting depth)
// Uses: useQuery(api.documents.getByWorkspace, { workspaceId, parentDocumentId })
// Renders: list of <DocumentItem> components
// Each DocumentItem can be expanded to show its children (another DocumentList with level + 1)
// At the bottom of each level, show an "Add a page" button
```

### `components/documents/document-item.tsx`
Single document row in the sidebar tree.

```tsx
// Props: id, title, icon, level, expanded, onExpand, active
// Features:
//   - Indent based on level (paddingLeft: level * 12 + 12)
//   - Expand/collapse chevron (rotates 90° when expanded)
//   - Document icon (emoji or default FileText icon)
//   - Title text (truncated)
//   - Hover actions: + (create child doc), ··· (more menu with archive)
//   - Click navigates to /documents/[id]
//   - Active state highlight when pathname matches
```

### Wire into sidebar.tsx
Add the document tree below the nav routes:

```tsx
// In SidebarContent, after the routes nav:
<Separator className="my-2" />
<div className="flex items-center justify-between px-3 py-1">
  <span className="text-xs font-semibold text-muted-foreground uppercase">Documents</span>
  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={createNewDoc}>
    <Plus className="h-3.5 w-3.5" />
  </Button>
</div>
<DocumentList workspaceId={activeWorkspaceId} level={0} />
```

---

## Step 4: Build Document Editor Page

### `app/(main)/documents/[documentId]/page.tsx`

```tsx
"use client";
// Uses: useParams() to get documentId
// Uses: useQuery(api.documents.getById, { id }) to load document
// Shows: <DocumentToolbar> at top, <Editor> below
// Layout: max-w-3xl mx-auto with padding for a clean Notion-like feel

// States:
//   - Loading: show skeleton
//   - Not found: show "Document not found" message
//   - Found: render toolbar + editor
```

### `app/(main)/documents/page.tsx`
Update the existing placeholder to show a proper empty state:

```tsx
// Show centered message: "Select a document or create a new one"
// Include a "Create document" button
```

---

## Step 5: Build Tiptap Editor

### `components/documents/editor.tsx`

```tsx
"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";

// Props: initialContent (string | undefined), onChange (content: string) => void
//
// const editor = useEditor({
//   extensions: [
//     StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
//     Placeholder.configure({ placeholder: "Start writing..." }),
//     TaskList,
//     TaskItem.configure({ nested: true }),
//     Link.configure({ openOnClick: false }),
//     Highlight,
//     TextAlign.configure({ types: ["heading", "paragraph"] }),
//     Underline,
//   ],
//   content: initialContent ? JSON.parse(initialContent) : undefined,
//   editorProps: {
//     attributes: {
//       class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-4",
//     },
//   },
//   onUpdate: ({ editor }) => {
//     onChange(JSON.stringify(editor.getJSON()));
//   },
// });
//
// return <EditorContent editor={editor} />;
```

**Important:** Use `useDebounce` hook from `hooks/use-debounce.ts` in the page component to debounce `updateContent` calls (500ms delay). Don't debounce inside the editor component itself.

### `components/documents/editor-toolbar.tsx`
Formatting toolbar above the editor.

```tsx
// Props: editor (from useEditor)
// Buttons (toggle style):
//   Bold | Italic | Underline | Strikethrough | separator
//   H1 | H2 | H3 | separator
//   Bullet List | Ordered List | Task List | separator
//   Link | Highlight | separator
//   Align Left | Align Center | Align Right
//
// Each button uses editor.chain().focus().toggleBold().run() etc.
// Active state: editor.isActive("bold") → variant="secondary"
// Use shadcn Toggle or Button with active styling
```

---

## Step 6: Build Document Toolbar

### `components/documents/document-toolbar.tsx`

```tsx
// Props: document (from useQuery)
// Features:
//   - Editable title (inline input, calls update mutation on blur/Enter)
//   - Icon display + picker (emoji picker or simple icon selector)
//   - Archive button (moves to trash)
//   - "More" dropdown: Rename, Delete permanently (if archived)
//
// Title editing pattern:
//   const [isEditing, setIsEditing] = useState(false);
//   const [title, setTitle] = useState(document.title);
//   // On blur or Enter: call update({ id: document._id, title })
```

---

## Key Patterns to Remember

### Debounced Auto-Save
```tsx
// In documents/[documentId]/page.tsx:
const [content, setContent] = useState(document.content);
const debouncedContent = useDebounce(content, 500);

useEffect(() => {
  if (debouncedContent !== undefined && debouncedContent !== document.content) {
    updateContent({ id: document._id, content: debouncedContent });
  }
}, [debouncedContent]);

// Pass setContent as onChange to <Editor>
```

### Recursive Document Tree
```tsx
// DocumentList calls itself for children:
<DocumentList
  workspaceId={workspaceId}
  parentDocumentId={doc._id}  // ← this makes it recursive
  level={level + 1}
/>
```

### Tiptap Content Storage
- Store as `JSON.stringify(editor.getJSON())` in Convex
- Load with `JSON.parse(content)` when initializing editor
- Content field is `v.optional(v.string())` — new docs have no content

---

## File Creation Checklist

```
Create:
  ├── convex/documents.ts
  ├── components/documents/document-list.tsx
  ├── components/documents/document-item.tsx
  ├── components/documents/editor.tsx
  ├── components/documents/editor-toolbar.tsx
  ├── components/documents/document-toolbar.tsx
  └── app/(main)/documents/[documentId]/page.tsx

Modify:
  ├── app/(main)/_components/sidebar.tsx  (add document tree)
  └── app/(main)/documents/page.tsx       (update empty state)
```
