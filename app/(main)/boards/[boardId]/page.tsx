"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BoardHeader } from "@/components/boards/board-header";
import { KanbanBoard } from "@/components/boards/kanban-board";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const router = useRouter();
  const boardId = params.boardId as Id<"boards">;

  const board = useQuery(api.boards.getById, { id: boardId });

  // Loading
  if (board === undefined) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0">
              <Skeleton className="h-10 w-full rounded-t-lg" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (board === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Board not found</p>
        <p className="text-sm">
          This board may have been deleted or you don&apos;t have access.
        </p>
        <Button variant="outline" onClick={() => router.push("/boards")}>
          Back to boards
        </Button>
      </div>
    );
  }

  // Archived
  if (board.isArchived) {
    return <ArchivedBanner boardId={boardId} title={board.title} />;
  }

  return (
    <div className="flex h-full flex-col">
      <BoardHeader board={board} />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard boardId={boardId} />
      </div>
    </div>
  );
}

function ArchivedBanner({
  title,
}: {
  boardId: Id<"boards">;
  title: string;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <AlertTriangle className="h-12 w-12 opacity-30" />
      <div className="text-center">
        <p className="text-lg font-medium">
          &ldquo;{title}&rdquo; has been archived
        </p>
        <p className="mt-1 text-sm">
          This board is in the trash.
        </p>
      </div>
      <Button variant="outline" onClick={() => router.push("/boards")}>
        Back to boards
      </Button>
    </div>
  );
}
