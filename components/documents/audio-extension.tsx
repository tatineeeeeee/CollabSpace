"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Music } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioBlock: {
      setAudioBlock: (attrs?: { src?: string }) => ReturnType;
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

function AudioBlockView({ node, updateAttributes, editor }: NodeViewProps) {
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
        <div className="audio-block">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-lg border border-dashed p-4"
          >
            <Music className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste audio URL (https://...)"
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
      <div className="audio-block">
        <audio controls src={src} className="w-full rounded-lg">
          Your browser does not support audio.
        </audio>
      </div>
    </NodeViewWrapper>
  );
}

export const AudioBlock = Node.create({
  name: "audioBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-audio-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    if (!src || !isSafeUrl(src)) {
      return ["div", mergeAttributes({ "data-audio-block": "" }, HTMLAttributes)];
    }
    return [
      "div",
      mergeAttributes({ "data-audio-block": "" }, HTMLAttributes),
      ["audio", { controls: "true", src, style: "width:100%;" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioBlockView);
  },

  addCommands() {
    return {
      setAudioBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});
