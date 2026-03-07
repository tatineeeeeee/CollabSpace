"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useEffectEvent } from "react";
import { FileText, ChevronRight, Search } from "lucide-react";
import { IconRenderer } from "@/components/shared/icon-renderer";
import type { MentionDocument } from "./mention-extension";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    linkToPage: {
      setLinkToPage: (attrs?: {
        pageId?: string;
        pageTitle?: string;
        pageIcon?: string;
      }) => ReturnType;
    };
  }
}

// Module-level ref set by editor — same pattern as mentions
let getDocsFn: (() => MentionDocument[]) | null = null;

export function setLinkToPageDocsFn(fn: () => MentionDocument[]) {
  getDocsFn = fn;
}

function LinkToPageView({ node, updateAttributes, editor }: NodeViewProps) {
  const { pageId, pageTitle, pageIcon } = node.attrs as {
    pageId: string;
    pageTitle: string;
    pageIcon: string;
  };
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const docs = getDocsFn?.() ?? [];
  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    if (!pageId) inputRef.current?.focus();
  }, [pageId]);

  const onQueryChange = useEffectEvent(() => {
    setSelectedIndex(0);
  });
  useEffect(() => {
    onQueryChange();
  }, [query]);

  const selectDoc = (doc: MentionDocument) => {
    updateAttributes({
      pageId: doc.id,
      pageTitle: doc.title,
      pageIcon: doc.icon || "",
    });
  };

  if (!pageId) {
    if (!editor.isEditable) return null;

    return (
      <NodeViewWrapper>
        <div className="link-to-page link-to-page-picker">
          <div className="flex items-center gap-2 border border-dashed rounded-lg p-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const doc = filtered[selectedIndex];
                  if (doc) selectDoc(doc);
                }
              }}
              placeholder="Search for a page..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {filtered.length > 0 && (
            <div className="mt-1 rounded-lg border bg-popover p-1 shadow-sm max-h-48 overflow-y-auto">
              {filtered.map((doc, i) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => selectDoc(doc)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-background text-xs">
                    <IconRenderer icon={doc.icon ?? ""} className="h-3.5 w-3.5 text-xs" fallback={<FileText className="h-3.5 w-3.5" />} />
                  </span>
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
            </div>
          )}
          {filtered.length === 0 && query && (
            <p className="mt-1 px-2 py-1.5 text-xs text-muted-foreground">
              No pages found
            </p>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  const handleClick = () => {
    window.open(`/documents/${pageId}`, "_blank");
  };

  return (
    <NodeViewWrapper>
      <div
        className="link-to-page link-to-page-card"
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
      >
        <span className="link-to-page-icon">
          <IconRenderer icon={pageIcon ?? ""} className="h-4 w-4 text-base" fallback={<FileText className="h-4 w-4" />} />
        </span>
        <span className="link-to-page-title">{pageTitle || "Untitled"}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
      </div>
    </NodeViewWrapper>
  );
}

export const LinkToPage = Node.create({
  name: "linkToPage",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      pageId: { default: null },
      pageTitle: { default: null },
      pageIcon: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-link-to-page]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes.pageTitle || "Page";
    const pageId = HTMLAttributes.pageId;
    return [
      "div",
      mergeAttributes({ "data-link-to-page": "" }, HTMLAttributes),
      [
        "a",
        { href: pageId ? `/documents/${pageId}` : "#" },
        title,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkToPageView);
  },

  addCommands() {
    return {
      setLinkToPage:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});
