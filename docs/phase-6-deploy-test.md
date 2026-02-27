# Phase 6 — Deploy & Test

**Goal:** Manual QA, production deployment, performance verification.

---

## Step 1: Manual QA Checklist

Test every flow end-to-end before deploying.

### Auth Flow
- [ ] Visit landing page → click "Get Started" → redirects to sign-up
- [ ] Sign up with email → redirected to /dashboard
- [ ] Sign out → redirected to landing page
- [ ] Sign in again → redirected to /dashboard
- [ ] User record exists in Convex `users` table

### Workspaces
- [ ] First-time user sees "Create your first workspace" dialog
- [ ] Create workspace → lands on dashboard
- [ ] Workspace switcher shows all workspaces
- [ ] Create second workspace via switcher
- [ ] Switch between workspaces → data changes accordingly
- [ ] Settings: rename workspace works
- [ ] Settings: delete workspace works (with confirmation)

### Documents
- [ ] Create document from sidebar → opens editor
- [ ] Type in editor → content auto-saves (check Convex dashboard)
- [ ] Refresh page → content persists
- [ ] Create nested document (child page)
- [ ] Sidebar tree shows nested structure with expand/collapse
- [ ] Rename document via toolbar
- [ ] Archive document → disappears from sidebar
- [ ] Restore document from trash
- [ ] Permanently delete archived document
- [ ] Rich text formatting: bold, italic, headings, lists, task lists, links, highlight

### Boards
- [ ] Create board → appears in boards grid
- [ ] Open board → kanban view loads
- [ ] Add column → appears at the end
- [ ] Add card to column → appears in column
- [ ] Drag card within column → order changes and persists on refresh
- [ ] Drag card to different column → moves and persists
- [ ] Drag column to reorder → order changes and persists
- [ ] Open card detail → edit title, description, labels, due date
- [ ] Archive board → disappears from grid

### Search
- [ ] Press Ctrl+K → search dialog opens
- [ ] Type document title → results appear
- [ ] Click result → navigates to document/board
- [ ] Search button in sidebar opens dialog

### Real-Time Sync
- [ ] Open app in two browser tabs (same account)
- [ ] Create document in Tab 1 → appears in Tab 2 sidebar immediately
- [ ] Edit document in Tab 1 → content updates in Tab 2
- [ ] Create board + cards in Tab 1 → visible in Tab 2
- [ ] Drag card in Tab 1 → moves in Tab 2

### Dark Mode
- [ ] Toggle dark mode → UI switches themes
- [ ] Refresh → theme persists
- [ ] Editor looks correct in dark mode

### Mobile
- [ ] Resize to mobile width → sidebar becomes hamburger menu
- [ ] Sheet sidebar opens and closes properly
- [ ] All pages are usable on mobile width
- [ ] Kanban board scrolls horizontally

---

## Step 2: Deploy Convex to Production

```bash
# 1. Deploy Convex functions to production
npx convex deploy

# 2. Note the production Convex URL
# It will be different from the dev URL
```

Set production environment variables in Convex Dashboard:
- `CLERK_JWT_ISSUER_DOMAIN` → your Clerk domain (same as dev)

---

## Step 3: Deploy to Vercel

```bash
# Option A: Via Vercel CLI
npm i -g vercel
vercel

# Option B: Via GitHub
# Push to GitHub → connect repo in Vercel Dashboard → auto-deploy
```

### Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_CONVEX_URL=<production Convex URL>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<same as dev>
CLERK_SECRET_KEY=<same as dev>
CLERK_WEBHOOK_SECRET=<will be new — set up in step 4>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

---

## Step 4: Configure Clerk Webhook for Production

1. Go to Clerk Dashboard → Webhooks
2. Create new webhook endpoint:
   - URL: `https://<your-convex-production-url>/webhooks/clerk`
   - Events: `user.created`, `user.updated`
3. Copy the signing secret → set as `CLERK_WEBHOOK_SECRET` in Convex production env vars

---

## Step 5: Post-Deploy Verification

- [ ] Visit production URL → landing page loads
- [ ] Sign up → workspace creation → dashboard works
- [ ] Create document → edit → refresh → persists
- [ ] Create board → add cards → drag → persists
- [ ] Search works
- [ ] Real-time sync works (two tabs)
- [ ] Dark mode works
- [ ] Mobile layout works

---

## Step 6: Performance Check

### Convex Indexes
Verify all queries use indexes (no full table scans):
- `users`: `by_clerk_id`, `by_email`
- `workspaces`: `by_user`
- `workspaceMembers`: `by_workspace`, `by_user`, `by_workspace_and_user`
- `documents`: `by_workspace`, `by_workspace_archived`, `by_parent`, `by_workspace_parent`, `by_user`
- `boards`: `by_workspace`, `by_workspace_archived`, `by_user`
- `lists`: `by_board`, `by_board_order`
- `cards`: `by_list`, `by_list_order`, `by_board`, `by_assignee`
- `activities`: `by_workspace`, `by_workspace_recent`, `by_user`

### Lazy Loading
Ensure heavy components are lazy-loaded:
```tsx
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/documents/editor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

const KanbanBoard = dynamic(() => import("@/components/boards/kanban-board"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});
```

### Bundle Size
```bash
npm run build
# Check the output for any large chunks
# Tiptap and dnd-kit should be code-split via dynamic imports
```

---

## Final Result

App is live at a public URL with:
- Full auth flow (Clerk)
- Workspace management
- Notion-style documents with rich text
- Trello-style kanban boards with drag-and-drop
- Global search (Cmd+K)
- Real-time sync across tabs
- Dark mode
- Mobile responsive
- Activity feed on dashboard
