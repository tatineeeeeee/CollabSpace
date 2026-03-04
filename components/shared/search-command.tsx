"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceStore } from "@/hooks/use-workspace";
import { useSearchStore } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { FileText, Kanban } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export function SearchCommand() {
  const router = useRouter();
  const { isOpen, close, toggle } = useSearchStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const searchArgs =
    activeWorkspaceId && debouncedQuery.length > 0
      ? {
          workspaceId: activeWorkspaceId as Id<"workspaces">,
          query: debouncedQuery,
        }
      : "skip";

  const documents = useQuery(api.documents.search, searchArgs);
  const boards = useQuery(api.boards.search, searchArgs);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  const handleSelect = (path: string) => {
    router.push(path);
    close();
    setQuery("");
  };

  const hasResults =
    (documents && documents.length > 0) || (boards && boards.length > 0);

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          close();
          setQuery("");
        }
      }}
      title="Search"
      description="Search for documents and boards"
    >
      <CommandInput
        placeholder="Search documents and boards..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!hasResults && (
          <CommandEmpty>
            {query.length === 0
              ? "Start typing to search..."
              : "No results found."}
          </CommandEmpty>
        )}
        {documents && documents.length > 0 && (
          <CommandGroup heading="Documents">
            {documents.map((doc) => (
              <CommandItem
                key={doc._id}
                value={`${doc._id}-${doc.title}`}
                onSelect={() => handleSelect(`/documents/${doc._id}`)}
              >
                {doc.icon ? (
                  <span className="text-sm">{doc.icon}</span>
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>{doc.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {boards && boards.length > 0 && (
          <CommandGroup heading="Boards">
            {boards.map((board) => (
              <CommandItem
                key={board._id}
                value={`${board._id}-${board.title}`}
                onSelect={() => handleSelect(`/boards/${board._id}`)}
              >
                {board.icon ? (
                  <span className="text-sm">{board.icon}</span>
                ) : (
                  <Kanban className="h-4 w-4" />
                )}
                <span>{board.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
