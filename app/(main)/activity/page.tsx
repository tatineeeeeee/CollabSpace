"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { formatRelativeTime } from "@/lib/utils";
import { ACTIVITY_LABELS } from "@/lib/activity-labels";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function ActivityPage() {
  const { activeWorkspaceId } = useWorkspaceStore();

  const activities = useQuery(
    api.activities.getRecent,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<"workspaces">, limit: 100 }
      : "skip"
  );

  if (activities === undefined) {
    return (
      <div className="mx-auto max-w-2xl p-6 md:p-8">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Actions in your workspace will appear here."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">Activity</h1>
      <div className="flex flex-col gap-4">
        {activities.map((activity) => (
          <div key={activity._id} className="flex items-start gap-3 text-sm">
            <Avatar className="mt-0.5 h-8 w-8">
              {activity.userImageUrl && (
                <AvatarImage src={activity.userImageUrl} />
              )}
              <AvatarFallback>
                {activity.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-medium">{activity.userName}</span>{" "}
                <span className="text-muted-foreground">
                  {ACTIVITY_LABELS[activity.type] ?? activity.type}
                </span>{" "}
                <span className="font-medium">{activity.entityTitle}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
