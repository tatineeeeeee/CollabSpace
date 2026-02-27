"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { redirect, useRouter } from "next/navigation";
import { Loader2, Menu } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { useSidebarStore } from "@/hooks/use-sidebar";
import { Sidebar } from "./_components/sidebar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const workspaces = useQuery(api.workspaces.getByUser);
  const createWorkspace = useMutation(api.workspaces.create);
  const { setActiveWorkspaceId } = useWorkspaceStore();

  const router = useRouter();
  const [name, setName] = useState("My Workspace");
  const [creating, setCreating] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    redirect("/");
  }

  // Still loading workspaces from Convex
  if (workspaces === undefined || workspaces === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated but no workspaces — show full-screen dialog
  if (workspaces.length === 0) {
    const handleCreate = async () => {
      if (!name.trim()) return;
      setCreating(true);
      try {
        const id = await createWorkspace({ name: name.trim() });
        setActiveWorkspaceId(id);
        toast.success("Workspace created!");
        router.push("/dashboard");
      } catch {
        toast.error("Failed to create workspace");
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center">
        <Dialog open>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create your first workspace</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              A workspace is where your team&apos;s documents and boards live.
            </p>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first-workspace-name">Workspace name</Label>
                <Input
                  id="first-workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
              >
                Get started
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Has workspaces — render normal app
  return <AppShell>{children}</AppShell>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle, setMobileOpen } = useSidebarStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-[margin] duration-200 ease-in-out",
          collapsed && "md:-ml-60"
        )}
      >
        {/* Top bar — visible when sidebar collapsed (desktop) or always (mobile) */}
        <header
          className={cn(
            "flex h-12 shrink-0 items-center border-b px-4",
            collapsed ? "md:flex" : "md:hidden"
          )}
        >
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            // Desktop: toggle sidebar, Mobile: open sheet
            if (window.innerWidth >= 768) {
              toggle();
            } else {
              setMobileOpen(true);
            }
          }}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
