"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Video } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoBlock: {
      setVideoBlock: (attrs?: { src?: string }) => ReturnType;
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

function VideoBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const src = (node.attrs as { src: string }).src;
  const [urlInput, setUrlInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSafeUrl(urlInput)) {
      updateAttributes({ src: urlInput });
    }
  };

  if (!src) {
    if (!editor.isEditable) return null;

    return (
      <NodeViewWrapper>
        <div className="video-block">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-lg border border-dashed p-4"
          >
            <Video className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste video URL (https://...)"
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
      <div className="video-block">
        <video controls src={src} className="w-full rounded-lg">
          Your browser does not support video.
        </video>
      </div>
    </NodeViewWrapper>
  );
}

export const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-video-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    if (!src || !isSafeUrl(src)) {
      return ["div", mergeAttributes({ "data-video-block": "" }, HTMLAttributes)];
    }
    return [
      "div",
      mergeAttributes({ "data-video-block": "" }, HTMLAttributes),
      ["video", { controls: "true", src, style: "width:100%;aspect-ratio:16/9;" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockView);
  },

  addCommands() {
    return {
      setVideoBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});
