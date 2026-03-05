"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronsUpDown, Plus, Check, Building2 } from "lucide-react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const workspaces = useQuery(api.workspaces.getByUser);
  const createWorkspace = useMutation(api.workspaces.create);
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();

  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const activeWorkspace = workspaces?.find((w) => w?._id === activeWorkspaceId);

  // Auto-select first workspace when workspaces load
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0]!._id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const id = await createWorkspace({ name: name.trim() });
      setActiveWorkspaceId(id);
      setName("");
      setDialogOpen(false);
      toast.success(`Workspace "${name.trim()}" created`);
    } catch {
      toast.error("Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  // undefined = loading, null = unauthenticated — both show skeleton
  if (workspaces === undefined || workspaces === null) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-2 font-normal"
            size="sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                {activeWorkspace?.icon ? (
                  <span className="text-sm leading-none">{activeWorkspace.icon}</span>
                ) : activeWorkspace?.name?.[0]?.toUpperCase() ?? (
                  <Building2 className="h-3 w-3" />
                )}
              </div>
              <span className="truncate text-sm">
                {activeWorkspace?.name ?? "Select workspace"}
              </span>
            </div>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>

          {workspaces.map((ws) => {
            if (!ws) return null;
            return (
              <DropdownMenuItem
                key={ws._id}
                onSelect={() => {
                  setActiveWorkspaceId(ws._id);
                  setOpen(false);
                }}
                className="gap-2"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                  {ws.icon ? (
                    <span className="text-sm leading-none">{ws.icon}</span>
                  ) : (
                    ws.name[0]?.toUpperCase()
                  )}
                </div>
                <span className="truncate">{ws.name}</span>
                {ws._id === activeWorkspaceId && (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              setDialogOpen(true);
            }}
            className="gap-2 text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                placeholder="My Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || loading}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
