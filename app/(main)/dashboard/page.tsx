"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Kanban, Plus } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function DashboardPage() {
  const { user } = useUser();
  const { activeWorkspaceId } = useWorkspaceStore();
  const workspace = useQuery(
    api.workspaces.getById,
    activeWorkspaceId
      ? { id: activeWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <div className="mt-1 text-muted-foreground">
          {workspace === undefined ? (
            <Skeleton className="mt-2 h-4 w-48" />
          ) : workspace ? (
            <p>You&apos;re in <span className="font-medium text-foreground">{workspace.name}</span>.</p>
          ) : (
            <p>Here&apos;s an overview of your workspace.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Documents</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Create and organize your team&apos;s documents with a rich text
            editor.
          </p>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/documents">
              <Plus className="h-4 w-4" />
              New Document
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Kanban className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Boards</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Manage projects with kanban boards. Drag and drop cards to track
            progress.
          </p>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/boards">
              <Plus className="h-4 w-4" />
              New Board
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
