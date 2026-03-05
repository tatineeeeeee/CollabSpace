"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface MembersSectionProps {
  workspaceId: Id<"workspaces">;
}

function getRoleBadgeClasses(role: string) {
  switch (role) {
    case "owner":
      return "bg-primary/10 text-primary";
    case "admin":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MembersSection({ workspaceId }: MembersSectionProps) {
  const members = useQuery(api.workspaces.getMembers, { workspaceId });

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-1 text-lg font-semibold">Members</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        People who have access to this workspace.
      </p>

      {members === undefined ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {members && members.filter((m): m is NonNullable<typeof m> => m !== null).length > 0 ? (
            members.filter((m): m is NonNullable<typeof m> => m !== null).map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3"
              >
                <Avatar className="h-9 w-9">
                  {member.imageUrl && (
                    <AvatarImage src={member.imageUrl} alt={member.name} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium leading-none">
                    {member.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeClasses(member.role)}`}
                >
                  {member.role}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No members found.</p>
          )}
        </div>
      )}
    </div>
  );
}
