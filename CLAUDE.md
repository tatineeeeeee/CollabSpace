# CollabSpace

A real-time team collaboration workspace (mini Notion + Trello) built as a portfolio project. Teams can create organizations, manage projects with kanban boards, assign tasks, and collaborate in real-time.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, TypeScript, React Compiler)
- **Database / Real-time:** Convex
- **Authentication:** Clerk
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Rich Text Editor:** Tiptap
- **Drag & Drop:** @dnd-kit
- **UI State:** zustand
- **Icons:** lucide-react
- **Deployment:** Vercel + Convex Cloud

## Project Structure

- `app/(marketing)/` — Public landing page: hero, features, how-it-works, CTA, footer
- `app/(auth)/` — Clerk sign-in / sign-up with split-screen brand layout
- `app/(main)/` — Authenticated app (protected by Clerk middleware)
- `app/(public)/` — Public routes (document preview with OG meta tags)
- `components/ui/` — shadcn/ui components (do not manually edit, use `bunx shadcn@latest add`)
- `components/providers/` — Context providers (Convex, Clerk, Theme)
- `components/documents/` — Document editor, toolbar, footer, list, cover image, trash
- `components/boards/` — Kanban board, columns, cards, card dialog, drag-and-drop
- `components/shared/` — Shared/reusable components (spinner, icon-picker, confirm-dialog, empty-state)
- `convex/` — Backend: schema, queries, mutations, HTTP actions
- `hooks/` — Custom React hooks (zustand stores, debounce, search)
- `lib/utils.ts` — Utility functions (cn helper, formatRelativeTime)
- `lib/activity-labels.ts` — Shared activity type label map

## Commands

- `bun run dev` — Start Next.js dev server
- `npx convex dev` — Start Convex dev server (run alongside Next.js)
- `bun run build` — Production build
- `bun run lint` — Run ESLint
- `npx convex deploy` — Deploy Convex to production
- `npm audit` — Security vulnerability scan (bun lacks built-in audit)

## Coding Conventions

### General
- Use TypeScript strict mode for all files
- Use the `@/*` path alias for imports (e.g., `@/components/ui/button`)
- Prefer named exports over default exports (except for page/layout components which must use default)
- Keep components small and focused — one component per file
- Use `"use client"` directive only when the component needs client-side interactivity (hooks, event handlers, browser APIs)

### File Naming
- Components: `kebab-case.tsx` (e.g., `kanban-board.tsx`, `document-list.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-search.ts`, `use-debounce.ts`)
- Convex functions: `kebab-case.ts` or `camelCase.ts` matching the table name (e.g., `documents.ts`, `cards.ts`)
- Route segments: `kebab-case` folders

### React 19.2 / React Compiler Patterns
- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`) — automatic memoization, no manual `useMemo`/`useCallback` needed in most cases
- **Rules of React are enforced** by compiler-powered ESLint rules (`eslint-plugin-react-hooks`):
  - `set-state-in-render` — never call `setState` during render phase
  - `set-state-in-effect` — never call `setState` synchronously inside `useEffect`; use `useEffectEvent` instead
  - `refs` — never read/write refs during render; only in effects and event handlers
  - `immutability` — never mutate props, state, or other immutable values
- **`useEffectEvent`** (React 19.2) — use for non-reactive logic in effects that should not trigger re-runs:
  ```tsx
  const onSave = useEffectEvent((data: string) => {
    setSaveStatus("saving");
    saveMutation({ content: data });
  });
  useEffect(() => { onSave(debouncedContent); }, [debouncedContent]);
  ```
  This replaces the old `useRef` callback pattern. Effect events always see the latest props/state and must NOT appear in dependency arrays.
- **Never call impure functions inside `useMemo`** — `Date.now()`, `new Date()`, `Math.random()` etc. are impure. Compute them outside the memo and pass as regular variables.
- **`<Activity>`** component (React 19.2) — use for pre-rendering hidden content while maintaining state:
  ```tsx
  <Activity mode={isVisible ? 'visible' : 'hidden'}><Page /></Activity>
  ```
  Better than conditional rendering when you want to preserve state across visibility changes.

### Next.js 16 Patterns
- Use Server Components by default; only add `"use client"` when necessary
- Page components (`page.tsx`) and layout components (`layout.tsx`) are default exports
- Co-locate route-specific components in `_components/` folders within route groups
- Use `loading.tsx` files for Suspense fallbacks where applicable
- Handle errors with `error.tsx` boundaries
- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed middleware to proxy
- **Turbopack** is the default bundler (2-5x faster builds)
- **`async params/searchParams`** — must use `await params` in page components
- **React Compiler** built-in via `reactCompiler: true` in `next.config.ts` (requires `babel-plugin-react-compiler`)

### Convex Patterns
- All database queries use `query()` with proper auth checks via `ctx.auth.getUserIdentity()`
- All database mutations use `mutation()` with auth validation
- Always use indexes for queries — never scan full tables
- Convex functions should validate that the user has access to the workspace/resource
- Store Tiptap editor content as stringified JSON (`v.string()`)
- Use `isArchived` for soft deletes — never hard delete user content
- Log user actions to the `activities` table from mutations (see Activity Logging section)
- Use `fetchQuery` from `convex/nextjs` for server-side data fetching (e.g., `generateMetadata` in layout files for OG tags)
- Helper functions `getAuthenticatedUser` and `verifyMembership` live in `convex/lib.ts` — reuse them in all mutations/queries

### Styling
- Use Tailwind CSS utility classes — no custom CSS unless absolutely necessary
- Follow shadcn/ui patterns for component styling (class-variance-authority + cn utility)
- Use CSS variables for theming (defined in globals.css)
- Support dark mode via `next-themes` and Tailwind's `dark:` prefix

### State Management
- Server state: Convex `useQuery()` and `useMutation()` — no need for React Query or SWR
- UI state (sidebar, modals): zustand stores in `hooks/`
- Form state: React `useState` or controlled components
- Never duplicate Convex data into local state — always read from `useQuery()`

### Authentication & Organizations
- Clerk proxy (`proxy.ts`) protects all `(main)` routes — Next.js 16 uses `proxy.ts` not `middleware.ts`
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, `/preview/*`
- Convex functions always verify auth via `ctx.auth.getUserIdentity()`
- User data synced from Clerk to Convex `users` table via webhook
- Use Clerk Organizations for team/org management
- All data (documents, boards, cards) is scoped to a workspace

### Drag & Drop (Kanban)
- Use `@dnd-kit/core` for DndContext and sensors
- Use `@dnd-kit/sortable` for sortable lists (columns and cards)
- Integer-based `order` field for positioning
- On drag end: compute new order values and call Convex reorder mutation
- **Optimistic local state during drag** — snapshot cards into `localCards` state on drag start, manipulate locally during drag (cross-list moves), and keep alive until server confirms the mutation via `useQuery` update. Never clear `localCards` before the mutation round-trips; clearing early causes snap-back because the UI falls back to stale server data.
- **Cross-container drop animation** — use `useState` (not `useRef`) for the `movedToNewList` flag that controls `DragOverlay`'s `dropAnimation` prop. Refs read during render are cached by the React Compiler and return stale values. Set `dropAnimation={null}` for cross-list moves to prevent snap-back animation.
- **Clear optimistic state with `useEffectEvent`** — watch `cards` (from `useQuery`) in a `useEffect`; when it changes and no drag is active, clear `localCards` and reset `movedToNewList`. Uses `useEffectEvent` to read latest state without violating the "no setState in effect" rule.

### Documents (Editor)
- Tiptap editor with extensions: StarterKit, Placeholder, TaskList, TaskItem, Link, Highlight, TextAlign, Underline, Callout (custom), SlashCommand
- **Slash command menu** (`slash-command.tsx`) — type `/` to open a floating command palette with block types (Text, H1-H3, lists, quote, code block, divider, callout). Uses `@tiptap/suggestion` for trigger detection, keyboard nav, and popup positioning.
- **Callout extension** (`callout-extension.ts`) — custom Tiptap block node with styled info box (left border + background tint + emoji icon). Supports `setCallout()` and `toggleCallout()` commands.
- Debounce content saves to Convex (500ms delay)
- Content stored as stringified Tiptap JSON
- Support nested documents via `parentDocumentId` self-reference
- Persistent toolbar (`editor-toolbar.tsx`) with heading select, inline formatting, lists, alignment, highlight, code, and link insertion
- Editor footer (`editor-footer.tsx`) shows word count and save status ("Saved" / "Saving..." / "Unsaved changes")
- Word count initialized via `useState` initializer (parse Tiptap JSON), updated in `onUpdate` callback
- Save status managed via `useEffectEvent` (React 19.2) — replaces the old `useRef` callback pattern
- Cover image picker supports gallery images, solid colors, gradients, custom URLs, and "Surprise me" random selection

### Activity Logging
- User actions are logged to the `activities` table from Convex mutations
- Activity types: `document_created`, `document_updated`, `document_archived`, `board_created`, `board_archived`, `card_created`, `card_moved`, etc.
- Shared label map in `lib/activity-labels.ts` — import `ACTIVITY_LABELS` for UI display
- Card drag-and-drop logs `card_moved` only when a card changes lists (not just reordering within same list)
- Activity page at `/activity` shows workspace-scoped history with avatars and relative timestamps

### Card Dialog
- Supports title, description (debounced save), labels, due date (Calendar picker from shadcn), assignee (DropdownMenu with workspace members), **checklist**, and **cover color**
- **Checklist** — array of `{ id, text, completed }` items stored on the card. Progress bar + item count. Add/toggle/edit/remove items. IDs generated via `crypto.randomUUID()`.
- **Cover color** — optional color strip at top of board cards. 10 preset colors with a picker in the dialog. Clear button to remove.
- `workspaceId` prop threaded from `[boardId]/page.tsx` → `KanbanBoard` → `CardDialog`
- Due date uses `date-fns` `format()` for display; clear button to remove
- Assignee queries `api.workspaces.getMembers`

### Board Filtering
- **Filter bar** (`board-filter-bar.tsx`) — renders above the kanban board with dropdowns for label (multi-select), assignee (multi-select), and due date status (overdue / this week / this month / no date)
- Client-side filtering — all cards already loaded via `useQuery`, filtered in a `useMemo` before grouping by list
- Active filter count badge + "Clear" button when filters are active
- Drag-and-drop works correctly with filters — order calculations use the full unfiltered card list

## Database Tables (Convex)

`users` · `workspaces` · `workspaceMembers` · `documents` · `boards` · `lists` · `cards` · `activities`

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key
- `CLERK_WEBHOOK_SECRET` — Clerk webhook signing secret
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`

## Important Rules

1. Never commit `.env.local` — it is gitignored
2. Never manually edit files in `components/ui/` — use `bunx shadcn@latest add <component>`
3. Never manually edit files in `convex/_generated/` — these are auto-generated
4. Always run `npx convex dev` alongside `bun run dev` during development
5. Always check auth in Convex functions before accessing data
6. Always use indexes in Convex queries — never do full table scans
7. Prefer editing existing files over creating new ones
8. Keep the landing page at `app/(marketing)/page.tsx`, not `app/page.tsx`

## Best Practices

### Project Architecture
- Use Next.js route groups `(marketing)`, `(auth)`, `(main)` to separate concerns and layouts
- Co-locate route-specific components in `_components/` within their route group
- Keep shared/reusable components in the top-level `components/` directory
- One component per file — name the file after the component in kebab-case
- Barrel exports (`index.ts`) are discouraged — import directly from the component file

### Performance
- Use Server Components by default — only add `"use client"` when hooks or interactivity are needed
- Lazy-load heavy components (Tiptap editor, kanban board) with `next/dynamic`
- Use `loading.tsx` files for streaming/suspense on route transitions
- Debounce expensive operations (editor saves, search input) with 300-500ms delay
- Use Convex indexes on every query — never do `.collect()` on an unindexed table scan
- **React Compiler handles memoization automatically** — do not manually add `useMemo`/`useCallback`/`React.memo` unless profiling shows the compiler missed an optimization. The compiler analyzes data flow and adds granular memoization at build time.

### Security
- All Convex queries and mutations must verify auth via `ctx.auth.getUserIdentity()` as the first line
- Validate that the authenticated user belongs to the organization that owns the resource
- Never trust client-side data — always validate inputs in Convex mutations using `v.` validators
- Never expose Clerk secret keys or webhook secrets to the client (no `NEXT_PUBLIC_` prefix)
- Use Clerk middleware to protect routes — never rely solely on client-side redirects
- Sanitize any user-generated content before rendering (Tiptap handles this for rich text)

### Error Handling
- Use `error.tsx` boundaries at route group level for graceful error pages
- Use `not-found.tsx` for 404 handling
- Show toast notifications (sonner) for user-facing errors from mutations
- In Convex functions, throw descriptive errors: `throw new Error("Document not found")` not `throw new Error("Error")`
- Never silently swallow errors — always log or surface them

### Real-Time Data (Convex)
- Use `useQuery()` for all data reads — it auto-subscribes to real-time updates
- Use `useMutation()` for all data writes — it handles optimistic updates
- Never cache or duplicate Convex query results in local state — let `useQuery` be the single source of truth
- Handle the `undefined` state from `useQuery` (loading) explicitly — show skeletons, not blank screens
- Keep Convex functions small and focused — one function per operation
- Use internal functions (`internalMutation`, `internalQuery`) for operations that should not be callable from the client

### UI / UX
- Always provide loading states (skeletons) for data-fetching components
- Always provide empty states (use `EmptyState` component from `components/shared/empty-state`)
- Use toast notifications (sonner) for success/error feedback on actions
- Support keyboard navigation — Cmd+K for search, Ctrl+N for new items, Escape to close modals
- Platform-aware shortcut hints: detect Mac via `navigator.platform`, show `⌘` vs `Ctrl`
- Make the sidebar collapsible on desktop and use a sheet (slide-over) on mobile
- Persist sidebar collapsed state with zustand `persist` middleware (`partialize` to exclude `mobileOpen`)
- Use consistent spacing and sizing from Tailwind's default scale
- Follow shadcn/ui component patterns — don't reinvent buttons, dialogs, dropdowns
- Use `ConfirmDialog` (shared component) for destructive actions — wraps AlertDialog with confirm/cancel
- Inline editing pattern: `localValue` state (null = using server value), set on focus, clear on blur/submit
- Deduplicate shared UI: render modals/dialogs once outside conditional branches, not in each branch
- Board cards should show timestamps (`formatRelativeTime`) and workspace emoji icons where available
- Landing page: gradient hero, mock product screenshot, "How it works" steps, bottom CTA, 4-column footer
- Landing page sections should alternate backgrounds (`bg-muted/50`, `bg-muted/30`) to create visual rhythm
- Footer links must resolve — never ship `href="#"` placeholders. Link to section anchors or remove the item.
- CTA copy must be honest — don't claim "Join teams already using X" without real users. Use action-oriented copy.
- Deduplicate shared elements in conditional branches (e.g., "See how it works" button rendered once outside auth conditionals)
- Auth pages: split-screen layout (brand panel on desktop, branding + back link on mobile)
- Auth left panel: use `<Link>` on the logo so users can navigate back to home
- Auth left panel: keep content focused — headline + checklist OR mockup, not both. Avoid overloading.
- Auth left panel: never add fake testimonials or fabricated stats — use real features and honest copy
- Auth left panel: decorative grid patterns need at least 15% opacity to be visible on dark backgrounds
- Auth right panel: add subtle gradient + glow blobs to avoid flat white/black background
- Auth layout copy should be generic enough to work on both sign-in and sign-up (shared layout)
- Use `<Link href="/sign-in">` not `<SignInButton mode="modal">` — route to dedicated auth pages, don't use Clerk modals
- Public preview: sticky bottom CTA bar ("Made with CollabSpace" + sign-up button)
- Settings page sections: workspace icon, workspace name, members list, appearance theme picker, danger zone

### Code Quality
- Write self-documenting code — clear variable/function names over comments
- Keep functions under 50 lines — extract helpers when they grow
- Group imports: React/Next → third-party → local components → local utils → types
- Use TypeScript `interface` for component props, `type` for unions and utility types
- Avoid `any` type — use `unknown` and narrow with type guards when needed
- Run `bun run lint` before committing

### Git Workflow
- Write clear commit messages: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`
- Commit frequently — one logical change per commit
- Never commit `node_modules/`, `.env.local`, or `convex/_generated/`

## Gotchas & Lessons Learned

### Next.js 16
- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed middleware to proxy. The file must be `proxy.ts` at the project root.
- **`tw-animate-css` import breaks Tailwind v4** — shadcn init adds `@import "tw-animate-css"` to `globals.css` but Tailwind v4 can't resolve it. Remove this import entirely; it is not needed.
- **Build-safe Convex provider** — `NEXT_PUBLIC_CONVEX_URL` may be empty during `next build` prerender. Use `useMemo` with a null check in `convex-client-provider.tsx`; if URL is missing, render `ClerkProvider` only (no Convex). This prevents `ConvexReactClient` from throwing "not an absolute URL".
- **Use `useAuth()` from `@clerk/nextjs`** — not `useConvexAuth()` — to check auth state in layout guards. `useConvexAuth` depends on the Convex client being initialized, which fails during build prerender.

### Convex
- **Clerk JWT Template required** — You must create a JWT Template named "convex" in Clerk Dashboard → JWT Templates → New template → Convex. Without it, `ConvexProviderWithClerk` calls `getToken({ template: "convex" })` which returns `null`, and every Convex function sees the user as unauthenticated. The Issuer URL on the template must match `CLERK_JWT_ISSUER_DOMAIN`.
- **`CLERK_JWT_ISSUER_DOMAIN` must include `https://` prefix** — Set in Convex Dashboard → Environment Variables (not `.env.local`). Value: `https://<your-clerk-domain>.clerk.accounts.dev`. Without the prefix, `getUserIdentity()` returns `null` and all auth checks fail.
- **Convex env vars are separate from `.env.local`** — `process.env` in Convex functions reads from the Convex Dashboard environment variables, not from the local `.env.local` file. Set `CLERK_JWT_ISSUER_DOMAIN` and `CLERK_WEBHOOK_SECRET` in the Convex Dashboard.
- **`convex/tsconfig.json` needs `"types": ["node"]`** — Required for `process.env` to work in `auth.config.ts`. This file is NOT in `convex/_generated/` so it is safe to edit.
- **Distinguish unauthenticated from empty in queries** — Convex queries that return `[]` when `!identity` can be misinterpreted as "no data". Return `null` for unauthenticated and `[]` for authenticated-but-empty so the UI can tell the difference.
- **`useQuery()` returns `undefined` while loading** — Always handle the `undefined` state explicitly (show skeletons). Use `"skip"` as the second argument to conditionally skip a query when args aren't ready: `useQuery(api.foo.bar, id ? { id } : "skip")`.
- **Auto-create user records in mutations** — The Clerk webhook may not have fired yet when a new user first interacts with the app. Mutations like `workspaces:create` should auto-insert a user record using `identity.name`, `identity.email`, and `identity.pictureUrl` if the user doesn't exist in the `users` table.
- **Use `internalMutation` for server-only operations** — Functions called from webhooks or other server-side code should use `internalMutation`/`internalQuery` so they can't be called from the client.
- **Convex `useMutation` is NOT optimistic by default** — `useQuery` results only update after the server confirms the mutation. If you maintain local optimistic state (e.g., `localCards` during drag-and-drop), do NOT clear it before `await mutation()` returns AND the `useQuery` subscription fires with updated data. Clearing early causes the UI to flash back to stale server state.

### React 19.2 / HTML
- **`<div>` inside `<p>` causes hydration errors** — shadcn `<Skeleton>` renders as a `<div>`. Never put it inside a `<p>` tag. Use a `<div>` wrapper instead when content may include block-level elements.
- **Never set state during render** — Sync data from `useQuery()` to local state with `useEffect`, not inline `if` statements during render. React Compiler's `set-state-in-render` rule enforces this.
- **Never call `setState` synchronously inside `useEffect`** — Use `useEffectEvent` (React 19.2) instead of the old `useRef` callback pattern. The compiler's `set-state-in-effect` rule enforces this:
  ```tsx
  // ✅ Correct: useEffectEvent
  const onSave = useEffectEvent((data) => { setSaveStatus("saving"); });
  useEffect(() => { onSave(data); }, [data]);

  // ❌ Wrong: setState directly in effect
  useEffect(() => { setSaveStatus("saving"); }, [data]);
  ```
- **Never read/write refs during render** — Only access `ref.current` inside effects and event handlers. The compiler's `refs` rule enforces this. If a ref value must influence JSX output (e.g., a prop like `dropAnimation`), convert it to `useState` instead — the compiler may cache stale ref values read during render.
- **Never call impure functions in `useMemo`** — `Date.now()`, `new Date()`, `Math.random()` produce unstable results. Compute outside the memo and pass as variables.
- **Use `useState` initializer for derived initial values** — Instead of computing initial state in a `useEffect` (which triggers an extra render), pass a function to `useState(() => computeValue())`. Example: computing initial word count from Tiptap JSON.
- **zustand `persist` middleware** — Use for UI state that should survive page refreshes (e.g., active workspace ID, sidebar collapsed). Store name must be unique: `{ name: "collabspace-workspace" }`. Use `partialize` to exclude transient state like `mobileOpen`.
- **Convex `getMembers` returns nullable items** — When mapping over arrays that may contain `null` (e.g., user lookups that failed), filter with a type guard: `.filter((m): m is NonNullable<typeof m> => m !== null)`.

### Tailwind v4
- **`bg-linear-to-*` not `bg-gradient-to-*`** — Tailwind v4 uses the canonical `bg-linear-to-br`, `bg-linear-to-b` etc. instead of the v3 `bg-gradient-to-*` shorthand.
- **shadcn `--overwrite` flag** — When adding shadcn components that already exist, use `bunx shadcn@latest add <component> --overwrite` (not `-y`, which triggers interactive prompts).

### Landing Page & Auth
- **Never use `<SignInButton mode="modal">`** in the navbar — it opens a Clerk popup and bypasses the custom auth page. Use `<Link href="/sign-in">` instead.
- **Footer links must resolve** — never ship `href="#"` placeholder links. Either link to a real section/page or remove the item.
- **Alternate section backgrounds** — use `bg-muted/30` or `bg-muted/50` on alternating sections to create visual rhythm and prevent the "one long block" feel.
- **Auth panel opacity** — CSS grid patterns and decorative elements on dark backgrounds need at least 15% opacity (`opacity-15`) to be visible. 5-7% is effectively invisible.

### Clerk Webhook Setup
- Endpoint URL: `https://<convex-deployment>.convex.site/webhooks/clerk`
- Subscribe to events: `user.created`, `user.updated`
- Copy the Signing Secret → add as `CLERK_WEBHOOK_SECRET` in Convex Dashboard env vars
- The webhook handler lives in `convex/http.ts` using `httpRouter()` and verifies signatures with `svix`
