"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function SettingsPage() {
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const workspace = useQuery(
    api.workspaces.getById,
    activeWorkspaceId
      ? { id: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );
  const updateWorkspace = useMutation(api.workspaces.update);
  const removeWorkspace = useMutation(api.workspaces.remove);

  const [name, setName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync input with loaded workspace name
  useEffect(() => {
    if (workspace?.name) setName(workspace.name);
  }, [workspace?.name]);

  const handleSave = async () => {
    if (!activeWorkspaceId || !name.trim()) return;
    setSaving(true);
    try {
      await updateWorkspace({
        id: activeWorkspaceId as Id<"workspaces">,
        name: name.trim(),
      });
      toast.success("Workspace updated");
    } catch {
      toast.error("Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspaceId) return;
    setDeleting(true);
    try {
      await removeWorkspace({ id: activeWorkspaceId as Id<"workspaces"> });
      setActiveWorkspaceId(null);
      setDeleteOpen(false);
      toast.success("Workspace deleted");
    } catch {
      toast.error("Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No workspace selected.
      </div>
    );
  }

  if (workspace === undefined) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (workspace === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-1 text-2xl font-bold">Settings</h1>
      <p className="mb-8 text-muted-foreground">
        Manage your workspace settings.
      </p>

      <div className="flex flex-col gap-6">
        {/* Rename */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Workspace name</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
            <div>
              <Button
                onClick={handleSave}
                disabled={
                  saving || !name.trim() || name.trim() === workspace.name
                }
                size="sm"
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Danger zone */}
        <div className="rounded-lg border border-destructive/40 p-6">
          <h2 className="mb-1 text-lg font-semibold text-destructive">
            Danger zone
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Deleting a workspace is permanent and cannot be undone. All
            documents and boards inside will be lost.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            Delete workspace
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete workspace?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{workspace.name}&quot; and all
              its content. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
