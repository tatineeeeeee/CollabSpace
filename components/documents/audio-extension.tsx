"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Music, Upload, Link2, Loader2, AlertCircle } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioBlock: {
      setAudioBlock: (attrs?: { src?: string }) => ReturnType;
    };
  }
}

const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

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
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getStorageUrl);

  const handleUpload = async (file: File) => {
    if (file.size > MAX_AUDIO_SIZE) {
      alert("File too large. Maximum size is 50MB.");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const servingUrl = await getStorageUrl({ storageId });
      if (servingUrl) updateAttributes({ src: servingUrl });
    } catch {
      // upload failed
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
          <div className="rounded-lg border border-dashed p-4">
            <div className="mb-3 flex gap-2 border-b pb-2">
              <button
                type="button"
                onClick={() => setTab("upload")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === "upload"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setTab("url")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === "url"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Embed link
              </button>
            </div>
            {tab === "upload" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  aria-label="Upload audio file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-6 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Music className="h-5 w-5" />
                  )}
                  {uploading ? "Uploading..." : "Click to upload audio"}
                </button>
              </>
            )}
            {tab === "url" && (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
            )}
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="audio-block">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <span>Failed to load audio</span>
            <button
              type="button"
              onClick={() => setError(false)}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="audio-block">
        <audio
          controls
          src={src}
          className="w-full rounded-lg"
          onError={() => setError(true)}
        >
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
