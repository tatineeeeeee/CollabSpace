"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (attrs: { src?: string }) => ReturnType;
    };
  }
}
import { useState } from "react";
import { Globe, ExternalLink } from "lucide-react";
import type { NodeViewProps } from "@tiptap/react";

function isSafeEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function EmbedView({ node, updateAttributes, editor }: NodeViewProps) {
  const { src } = node.attrs as { src: string };
  const [urlInput, setUrlInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSafeEmbedUrl(urlInput)) {
      updateAttributes({ src: urlInput });
    }
  };

  if (!src) {
    if (!editor.isEditable) return null;

    return (
      <NodeViewWrapper>
        <div className="embed-wrapper">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-lg border border-dashed p-4"
          >
            <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste an embed URL (https://...)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Embed
            </button>
          </form>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="embed-wrapper">
        <iframe
          src={src}
          sandbox="allow-scripts allow-same-origin allow-popups"
          loading="lazy"
          allowFullScreen
        />
        {editor.isEditable && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate">{src}</span>
          </a>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    if (!src || !isSafeEmbedUrl(src)) {
      return ["div", mergeAttributes({ "data-embed": "" }, HTMLAttributes)];
    }
    return [
      "div",
      mergeAttributes({ "data-embed": "" }, HTMLAttributes),
      [
        "iframe",
        {
          src,
          sandbox: "allow-scripts allow-same-origin allow-popups",
          loading: "lazy",
          allowfullscreen: "true",
          style: "width:100%;aspect-ratio:16/9;border:none;",
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },

  addCommands() {
    return {
      setEmbed:
        (attrs: { src?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
