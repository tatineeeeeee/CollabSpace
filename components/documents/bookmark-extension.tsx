"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bookmark as BookmarkIcon, ExternalLink, Loader2 } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookmark: {
      setBookmark: (attrs?: { url?: string }) => ReturnType;
    };
  }
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function BookmarkView({ node, updateAttributes, editor }: NodeViewProps) {
  const attrs = node.attrs as {
    url: string;
    title: string | null;
    description: string | null;
    favicon: string | null;
    image: string | null;
  };
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fetchMetadata = useAction(api.bookmarks.fetchMetadata);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!isSafeUrl(trimmed)) return;

    setLoading(true);
    try {
      const meta = await fetchMetadata({ url: trimmed });
      updateAttributes({
        url: meta.url,
        title: meta.title,
        description: meta.description,
        favicon: meta.favicon,
        image: meta.image,
      });
    } catch {
      updateAttributes({ url: trimmed });
    } finally {
      setLoading(false);
    }
  };

  if (!attrs.url) {
    if (!editor.isEditable) return null;

    return (
      <NodeViewWrapper>
        <div className="bookmark-card">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-lg border border-dashed p-4"
          >
            <BookmarkIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste a link (https://...)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Bookmark
            </button>
          </form>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <a
        href={attrs.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bookmark-card bookmark-loaded"
      >
        <div className="bookmark-meta">
          <div className="bookmark-title-row">
            {attrs.favicon && !faviconError && (
              <img
                src={attrs.favicon}
                alt=""
                className="bookmark-favicon"
                onError={() => setFaviconError(true)}
              />
            )}
            <span className="bookmark-title">
              {attrs.title || getDomain(attrs.url)}
            </span>
          </div>
          {attrs.description && (
            <p className="bookmark-description">{attrs.description}</p>
          )}
          <span className="bookmark-domain">
            <ExternalLink className="inline-block h-3 w-3 mr-1" />
            {getDomain(attrs.url)}
          </span>
        </div>
        {attrs.image && !imageError && (
          <div className="bookmark-image">
            <img
              src={attrs.image}
              alt=""
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </a>
    </NodeViewWrapper>
  );
}

export const BookmarkBlock = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
      title: { default: null },
      description: { default: null },
      favicon: { default: null },
      image: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bookmark]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const url = HTMLAttributes.url;
    const title = HTMLAttributes.title || url || "Bookmark";
    return [
      "div",
      mergeAttributes({ "data-bookmark": "" }, HTMLAttributes),
      [
        "a",
        { href: url, target: "_blank", rel: "noopener noreferrer" },
        title,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },

  addCommands() {
    return {
      setBookmark:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});
