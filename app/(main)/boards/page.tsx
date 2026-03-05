"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import type { Id } from "@/convex/_generated/dataModel";

export default function BoardsPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspaceStore();
  const boards = useQuery(
    api.boards.getByWorkspace,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );
  const createBoard = useMutation(api.boards.create);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleKeyboardNew = useCallback(() => {
    setCreateOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleKeyboardNew();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyboardNew]);

  const handleCreate = async () => {
    if (!activeWorkspaceId || !title.trim()) return;

    setCreating(true);
    try {
      const boardId = await createBoard({
        workspaceId: activeWorkspaceId as Id<"workspaces">,
        title: title.trim(),
      });
      setCreateOpen(false);
      setTitle("");
      router.push(`/boards/${boardId}`);
      toast.success("Board created");
    } catch {
      toast.error("Failed to create board");
    } finally {
      setCreating(false);
    }
  };

  // Loading
  if (boards === undefined) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Content
  const content =
    !boards || boards.length === 0 ? (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Kanban}
          title="No boards yet"
          description="Create a kanban board to organize your tasks"
          action={{ label: "Create a board", onClick: () => setCreateOpen(true) }}
        />
      </div>
    ) : (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Boards</h1>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New board
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card
              key={board._id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/boards/${board._id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {board.icon ? (
                    <span className="text-xl">{board.icon}</span>
                  ) : (
                    <Kanban className="h-5 w-5 text-muted-foreground" />
                  )}
                  {board.title}
                </CardTitle>
                {board.description && (
                  <CardDescription className="line-clamp-2">
                    {board.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Updated {formatRelativeTime(board.updatedAt ?? board._creationTime)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

  return (
    <>
      {content}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create board</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="board-title">Board title</Label>
              <Input
                id="board-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="e.g. Sprint Board"
                autoFocus
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || creating}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
