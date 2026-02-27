"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Settings,
  Search,
  ChevronsLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/hooks/use-sidebar";
import { WorkspaceSwitcher } from "./workspace-switcher";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Documents", icon: FileText, href: "/documents" },
  { label: "Boards", icon: Kanban, href: "/boards" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function SidebarContent({
  onNavigate,
  onCollapse,
}: {
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 py-3">
        <div className="flex-1 min-w-0">
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

      <Separator />

      <div className="flex-1 px-3 py-3">
        <div className="mb-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            size="sm"
          >
            <Search className="h-4 w-4" />
            Search
            <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Ctrl+K
            </kbd>
          </Button>
        </div>

        <Separator className="my-2" />

        <nav className="flex flex-col gap-1">
          {routes.map((route) => (
            <Link key={route.href} href={route.href} onClick={onNavigate}>
              <Button
                variant={pathname === route.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  pathname === route.href && "font-medium"
                )}
                size="sm"
              >
                <route.icon className="h-4 w-4" />
                {route.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      <Separator />

      <div className="flex items-center gap-2 px-4 py-3">
        <UserButton />
        <span className="text-sm text-muted-foreground">Account</span>
      </div>
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
