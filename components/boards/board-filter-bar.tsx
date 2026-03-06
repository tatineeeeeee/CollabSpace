"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Search, User, X } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export interface BoardFilters {
  labelColors: string[];
  assigneeIds: Id<"users">[];
  dueDateFilter: "all" | "overdue" | "this_week" | "this_month" | "no_date";
  searchQuery: string;
  myCards: boolean;
}

export const DEFAULT_FILTERS: BoardFilters = {
  labelColors: [],
  assigneeIds: [],
  dueDateFilter: "all",
  searchQuery: "",
  myCards: false,
};

interface BoardFilterBarProps {
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  workspaceId: Id<"workspaces">;
  cards: Doc<"cards">[];
  currentUserId?: Id<"users">;
}

const DUE_DATE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "this_week", label: "Due this week" },
  { value: "this_month", label: "Due this month" },
  { value: "no_date", label: "No due date" },
] as const;

export function BoardFilterBar({
  filters,
  onFiltersChange,
  workspaceId,
  cards,
  currentUserId,
}: BoardFilterBarProps) {
  const members = useQuery(api.workspaces.getMembers, { workspaceId });

  // Extract unique labels from cards
  const labelMap = new Map<string, { name: string; color: string }>();
  for (const card of cards) {
    for (const label of card.labels ?? []) {
      if (!labelMap.has(label.color)) {
        labelMap.set(label.color, label);
      }
    }
  }
  const availableLabels = Array.from(labelMap.values());

  const activeFilterCount =
    filters.labelColors.length +
    filters.assigneeIds.length +
    (filters.dueDateFilter !== "all" ? 1 : 0) +
    (filters.searchQuery ? 1 : 0) +
    (filters.myCards ? 1 : 0);

  const handleToggleLabelColor = (color: string) => {
    const newColors = filters.labelColors.includes(color)
      ? filters.labelColors.filter((c) => c !== color)
      : [...filters.labelColors, color];
    onFiltersChange({ ...filters, labelColors: newColors });
  };

  const handleToggleAssignee = (userId: Id<"users">) => {
    const newIds = filters.assigneeIds.includes(userId)
      ? filters.assigneeIds.filter((id) => id !== userId)
      : [...filters.assigneeIds, userId];
    onFiltersChange({ ...filters, assigneeIds: newIds });
  };

  const handleDueDateFilter = (
    value: BoardFilters["dueDateFilter"]
  ) => {
    onFiltersChange({ ...filters, dueDateFilter: value });
  };

  const handleClearFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="flex items-center gap-2 px-4 pt-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Search cards..."
          className="h-8 w-40 pl-7 text-xs"
        />
        {filters.searchQuery && (
          <button
            type="button"
            title="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* My Cards */}
      {currentUserId && (
        <Button
          variant={filters.myCards ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => onFiltersChange({ ...filters, myCards: !filters.myCards })}
        >
          <User className="h-3 w-3" />
          My cards
        </Button>
      )}

      {/* Label Filter */}
      {availableLabels.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter className="h-3 w-3" />
              Labels
              {filters.labelColors.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.labelColors.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex flex-col gap-1">
              {availableLabels.map((label) => (
                <label
                  key={label.color}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={filters.labelColors.includes(label.color)}
                    onCheckedChange={() => handleToggleLabelColor(label.color)}
                  />
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Assignee Filter */}
      {members && members.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Assignee
              {filters.assigneeIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.assigneeIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex flex-col gap-1">
              {members
                .filter((m): m is NonNullable<typeof m> => m !== null)
                .map((member) => (
                  <label
                    key={member.userId}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={filters.assigneeIds.includes(member.userId)}
                      onCheckedChange={() =>
                        handleToggleAssignee(member.userId)
                      }
                    />
                    {member.name}
                  </label>
                ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Due Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            Due date
            {filters.dueDateFilter !== "all" && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                1
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="flex flex-col gap-1">
            {DUE_DATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleDueDateFilter(option.value)}
                className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  filters.dueDateFilter === option.value
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground"
          onClick={handleClearFilters}
        >
          <X className="h-3 w-3" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
