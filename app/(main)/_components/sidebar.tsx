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
    <div className="flex items-center gap-2 px-3 py-2.5">
      <UserButton
        appearance={{
          elements: { avatarBox: "h-6 w-6" },
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
      <div className="px-3 py-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <Star className="h-3 w-3" />
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
                "flex min-h-7 w-full items-center gap-1.5 rounded-sm px-3 py-1 text-sm text-muted-foreground hover:bg-accent/50",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              {fav.icon ? (
                <span className="shrink-0 text-sm">{fav.icon}</span>
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
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

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            size="sm"
            onClick={openSearch}
          >
            <Search className="h-4 w-4" />
            Search
            <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </Button>
        </div>

        <Separator className="my-2" />

        <nav className="flex flex-col gap-1">
          {routes.map((route) => {
            const isActive =
              pathname === route.href ||
              pathname.startsWith(route.href + "/");
            return (
              <Link key={route.href} href={route.href} onClick={onNavigate}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive && "font-medium"
                  )}
                  size="sm"
                >
                  <route.icon className="h-4 w-4" />
                  {route.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <FavoritesSection onNavigate={onNavigate} />

        <Separator className="my-2" />

        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Documents
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setTemplatePickerOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <DocumentList level={0} />

        <Separator className="my-2" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
              size="sm"
            >
              <Trash className="h-4 w-4" />
              Trash
            </Button>
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
          "hidden md:block h-full w-60 shrink-0 border-r bg-sidebar transition-transform duration-200 ease-in-out",
          collapsed && "-translate-x-full"
        )}
      >
        <SidebarContent onCollapse={toggle} />
      </aside>

      {/* Mobile sidebar (sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
