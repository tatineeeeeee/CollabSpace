# CollabSpace

A real-time team collaboration workspace (mini Notion + Trello) built as a portfolio project. Teams can create organizations, manage projects with kanban boards, assign tasks, and collaborate in real-time.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, TypeScript)
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

- `app/(marketing)/` — Public landing page (no auth required)
- `app/(auth)/` — Clerk sign-in / sign-up pages
- `app/(main)/` — Authenticated app (protected by Clerk middleware)
- `components/ui/` — shadcn/ui components (do not manually edit, use `npx shadcn@latest add`)
- `components/providers/` — Context providers (Convex, Clerk, Theme)
- `components/documents/` — Document-related components (editor, toolbar, list)
- `components/boards/` — Kanban board components (columns, cards, drag-and-drop)
- `components/shared/` — Shared/reusable components (spinner, icon-picker, confirm-dialog)
- `convex/` — Backend: schema, queries, mutations, HTTP actions
- `hooks/` — Custom React hooks
- `lib/utils.ts` — Utility functions (cn helper)

## Commands

- `npm run dev` — Start Next.js dev server
- `npx convex dev` — Start Convex dev server (run alongside Next.js)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npx convex deploy` — Deploy Convex to production

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

### React / Next.js Patterns
- Use Server Components by default; only add `"use client"` when necessary
- Page components (`page.tsx`) and layout components (`layout.tsx`) are default exports
- Co-locate route-specific components in `_components/` folders within route groups
- Use `loading.tsx` files for Suspense fallbacks where applicable
- Handle errors with `error.tsx` boundaries

### Convex Patterns
- All database queries use `query()` with proper auth checks via `ctx.auth.getUserIdentity()`
- All database mutations use `mutation()` with auth validation
- Always use indexes for queries — never scan full tables
- Convex functions should validate that the user has access to the workspace/resource
- Store Tiptap editor content as stringified JSON (`v.string()`)
- Use `isArchived` for soft deletes — never hard delete user content
- Log user actions to the `activities` table from mutations

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
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`
- Convex functions always verify auth via `ctx.auth.getUserIdentity()`
- User data synced from Clerk to Convex `users` table via webhook
- Use Clerk Organizations for team/org management
- All data (documents, boards, cards) is scoped to an organization

### Drag & Drop (Kanban)
- Use `@dnd-kit/core` for DndContext and sensors
- Use `@dnd-kit/sortable` for sortable lists (columns and cards)
- Integer-based `order` field for positioning
- On drag end: compute new order values and call Convex reorder mutation

### Documents (Editor)
- Tiptap editor with extensions: StarterKit, Placeholder, TaskList, TaskItem, Link, Highlight, TextAlign
- Debounce content saves to Convex (500ms delay)
- Content stored as stringified Tiptap JSON
- Support nested documents via `parentDocumentId` self-reference

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
2. Never manually edit files in `components/ui/` — use `npx shadcn@latest add <component>`
3. Never manually edit files in `convex/_generated/` — these are auto-generated
4. Always run `npx convex dev` alongside `npm run dev` during development
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
- Memoize expensive computations with `useMemo` and callbacks with `useCallback` only when profiling shows a need

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
- Always provide empty states when there are no items to display
- Use toast notifications for success/error feedback on actions
- Support keyboard navigation — Cmd+K for search, Escape to close modals
- Make the sidebar collapsible on desktop and use a sheet (slide-over) on mobile
- Use consistent spacing and sizing from Tailwind's default scale
- Follow shadcn/ui component patterns — don't reinvent buttons, dialogs, dropdowns

### Code Quality
- Write self-documenting code — clear variable/function names over comments
- Keep functions under 50 lines — extract helpers when they grow
- Group imports: React/Next → third-party → local components → local utils → types
- Use TypeScript `interface` for component props, `type` for unions and utility types
- Avoid `any` type — use `unknown` and narrow with type guards when needed
- Run `npm run lint` before committing

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

### React / HTML
- **`<div>` inside `<p>` causes hydration errors** — shadcn `<Skeleton>` renders as a `<div>`. Never put it inside a `<p>` tag. Use a `<div>` wrapper instead when content may include block-level elements.
- **Never set state during render** — Sync data from `useQuery()` to local state with `useEffect`, not inline `if` statements during render. React will throw errors if you call `setState` during the render phase.
- **zustand `persist` middleware** — Use for UI state that should survive page refreshes (e.g., active workspace ID). Store name must be unique: `{ name: "collabspace-workspace" }`.

### Clerk Webhook Setup
- Endpoint URL: `https://<convex-deployment>.convex.site/webhooks/clerk`
- Subscribe to events: `user.created`, `user.updated`
- Copy the Signing Secret → add as `CLERK_WEBHOOK_SECRET` in Convex Dashboard env vars
- The webhook handler lives in `convex/http.ts` using `httpRouter()` and verifies signatures with `svix`
