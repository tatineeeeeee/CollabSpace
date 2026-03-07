"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Settings,
  Activity,
  Search,
  ChevronsLeft,
  Plus,
  Trash,
  Moon,
  Sun,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "next-themes";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/hooks/use-sidebar";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { useSearchStore } from "@/hooks/use-search";
import { DocumentList } from "@/components/documents/document-list";
import { TrashBox } from "@/components/documents/trash-box";
import { TemplatePicker } from "@/components/documents/template-picker";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Documents", icon: FileText, href: "/documents" },
  { label: "Boards", icon: Kanban, href: "/boards" },
  { label: "Activity", icon: Activity, href: "/activity" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function SidebarHeader({ onCollapse }: { onCollapse?: () => void }) {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-0.5 px-3 py-2.5">
      <UserButton
        appearance={{
          elements: {
            avatarBox: { width: 24, height: 24, borderRadius: 4 },
            avatarImage: { borderRadius: 4 },
          },
        }}
      />
      <div className="min-w-0 flex-1">
        <WorkspaceSwitcher />
      </div>
      {onCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={onCollapse}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function SidebarFooter() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex items-center px-3 py-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-2 text-xs text-muted-foreground"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </Button>
    </div>
  );
}

function FavoritesSection({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeWorkspaceId } = useWorkspaceStore();

  const favorites = useQuery(
    api.favorites.getByWorkspace,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  if (!favorites || favorites.length === 0) return null;

  return (
    <>
      <Separator className="my-2" />
      <div className="flex items-center gap-1.5 rounded-md px-2 py-1">
        <Star className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Favorites
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {favorites.map((fav) => {
          const isActive = pathname === `/documents/${fav.documentId}`;
          return (
            <button
              key={fav._id}
              type="button"
              onClick={() => {
                router.push(`/documents/${fav.documentId}`);
                onNavigate?.();
              }}
              className={cn(
                "flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent/50",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <IconRenderer icon={fav.icon ?? ""} className="h-4 w-4 shrink-0 text-sm" fallback={<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />} />
              <span className="truncate">{fav.title}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function SidebarContent({
  onNavigate,
  onCollapse,
}: {
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { open: openSearch } = useSearchStore();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const createDocument = useMutation(api.documents.create);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const handleCreateFromTemplate = async (template: import("@/lib/document-templates").DocumentTemplate | null) => {
    if (!activeWorkspaceId) return;

    try {
      const docId = await createDocument({
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        title: template?.title ?? "Untitled",
        content: template?.content,
        icon: template?.icon,
      });
      router.push(`/documents/${docId}`);
      onNavigate?.();
      toast.success("New document created");
    } catch {
      toast.error("Failed to create document");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader onCollapse={onCollapse} />

      <Separator />

      <div className="sidebar-notion-font flex-1 overflow-y-auto px-2 py-2">
        {/* Search — compact trigger */}
        <button
          type="button"
          onClick={openSearch}
          className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent/50"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>

        {/* Navigation */}
        <nav className="mt-1 flex flex-col gap-0.5">
          {routes.map((route) => {
            const isActive =
              pathname === route.href ||
              pathname.startsWith(route.href + "/");
            return (
              <Link key={route.href} href={route.href} onClick={onNavigate}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 font-medium transition-colors hover:bg-accent/50",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <route.icon className="h-4 w-4 shrink-0" />
                  {route.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <FavoritesSection onNavigate={onNavigate} />

        <Separator className="my-2" />

        {/* Documents section header — hover reveals + button */}
        <div className="group/docs flex items-center justify-between rounded-md px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documents
          </span>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-accent group-hover/docs:opacity-100"
            onClick={() => setTemplatePickerOpen(true)}
            aria-label="New document"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <DocumentList level={0} />

        <Separator className="my-2" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <Trash className="h-4 w-4 shrink-0" />
              Trash
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" side="right" align="start">
            <TrashBox />
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      <SidebarFooter />

      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleCreateFromTemplate}
      />
    </div>
  );
}

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <>
      {/* Desktop sidebar — always rendered, slides via translateX */}
      <aside
        className={cn(
          "hidden md:block h-full w-[220px] shrink-0 border-r bg-sidebar transition-transform duration-200 ease-in-out",
          collapsed && "-translate-x-full"
        )}
      >
        <SidebarContent onCollapse={toggle} />
      </aside>

      {/* Mobile sidebar (sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[220px] p-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
