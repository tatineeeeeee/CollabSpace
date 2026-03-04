"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Kanban,
  Plus,
  ArrowRight,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

const ACTIVITY_LABELS: Record<string, string> = {
  document_created: "created",
  document_updated: "updated",
  document_archived: "archived",
  document_published: "published",
  board_created: "created",
  board_updated: "updated",
  card_created: "created card in",
  card_moved: "moved card in",
  card_updated: "updated card in",
};

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { activeWorkspaceId } = useWorkspaceStore();

  const workspace = useQuery(
    api.workspaces.getById,
    activeWorkspaceId
      ? { id: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  const documents = useQuery(
    api.documents.getByWorkspace,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  const boards = useQuery(
    api.boards.getByWorkspace,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  const activities = useQuery(
    api.activities.getRecent,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces">, limit: 15 }
      : "skip"
  );

  const createDocument = useMutation(api.documents.create);
  const createBoard = useMutation(api.boards.create);

  const recentDocuments = useMemo(() => {
    if (!documents || !Array.isArray(documents)) return [];
    return [...documents]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);
  }, [documents]);

  const recentBoards = useMemo(() => {
    if (!boards || !Array.isArray(boards)) return [];
    return [...boards]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);
  }, [boards]);

  const handleNewDocument = async () => {
    if (!activeWorkspaceId) return;
    try {
      const docId = await createDocument({
        title: "Untitled",
        workspaceId: activeWorkspaceId as Id<"workspaces">,
      });
      router.push(`/documents/${docId}`);
      toast.success("Document created");
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleNewBoard = async () => {
    if (!activeWorkspaceId) return;
    try {
      const boardId = await createBoard({
        title: "Untitled Board",
        workspaceId: activeWorkspaceId as Id<"workspaces">,
      });
      router.push(`/boards/${boardId}`);
      toast.success("Board created");
    } catch {
      toast.error("Failed to create board");
    }
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <div className="mt-1 text-muted-foreground">
          {workspace === undefined ? (
            <Skeleton className="mt-2 h-4 w-48" />
          ) : workspace ? (
            <p>
              You&apos;re in{" "}
              <span className="font-medium text-foreground">
                {workspace.name}
              </span>
            </p>
          ) : (
            <p>Here&apos;s an overview of your workspace.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button onClick={handleNewDocument} className="gap-2">
          <Plus className="h-4 w-4" />
          New Document
        </Button>
        <Button onClick={handleNewBoard} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Documents */}
        {documents === undefined ? (
          <WidgetSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Recent Documents
              </CardTitle>
              <CardAction>
                <Link
                  href="/documents"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No documents yet
                </p>
              ) : (
                <div className="space-y-1">
                  {recentDocuments.map((doc) => (
                    <Link
                      key={doc._id}
                      href={`/documents/${doc._id}`}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="shrink-0">
                        {doc.icon || <FileText className="h-4 w-4 text-muted-foreground" />}
                      </span>
                      <span className="flex-1 truncate">{doc.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(doc.updatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Boards */}
        {boards === undefined ? (
          <WidgetSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Kanban className="h-4 w-4" />
                Recent Boards
              </CardTitle>
              <CardAction>
                <Link
                  href="/boards"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {recentBoards.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No boards yet
                </p>
              ) : (
                <div className="space-y-1">
                  {recentBoards.map((board) => (
                    <Link
                      key={board._id}
                      href={`/boards/${board._id}`}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="shrink-0">
                        {board.icon || <Kanban className="h-4 w-4 text-muted-foreground" />}
                      </span>
                      <span className="flex-1 truncate">{board.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(board.updatedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Feed */}
        {activities === undefined ? (
          <WidgetSkeleton />
        ) : (
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!activities || activities.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Avatar size="sm" className="mt-0.5">
                        {activity.userImageUrl && (
                          <AvatarImage src={activity.userImageUrl} />
                        )}
                        <AvatarFallback>
                          {activity.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          <span className="font-medium">
                            {activity.userName}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {ACTIVITY_LABELS[activity.type] ?? activity.type}
                          </span>{" "}
                          <span className="font-medium">
                            {activity.entityTitle}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
