"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ImageIcon, Upload, Link2, Loader2 } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attrs?: { src?: string }) => ReturnType;
    };
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function ImageBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const attrs = node.attrs as {
    src: string | null;
    alt: string;
    caption: string;
    width: number;
  };
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getStorageUrl);

  const handleUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert("File too large. Maximum size is 10MB.");
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
      if (servingUrl) {
        updateAttributes({ src: servingUrl });
      }
    } catch {
      // upload failed
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSafeUrl(urlInput)) {
      updateAttributes({ src: urlInput });
    }
  };

  // Empty state — upload/URL tabs
  if (!attrs.src) {
    if (!editor.isEditable) return null;

    return (
      <NodeViewWrapper>
        <div className="my-2 rounded-lg border border-dashed p-4">
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
                accept="image/*"
                aria-label="Upload image"
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
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
                {uploading ? "Uploading..." : "Click to upload an image"}
              </button>
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                Max file size: 10MB
              </p>
            </>
          )}

          {tab === "url" && (
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste image URL..."
                className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Embed
              </button>
            </form>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded state — image + caption
  return (
    <NodeViewWrapper>
      <div
        className="image-block-container my-2"
        style={{ width: `${attrs.width}%`, margin: attrs.width < 100 ? "0.5rem auto" : undefined }}
      >
        {!imageError ? (
          <img
            src={attrs.src}
            alt={attrs.alt || ""}
            className="w-full rounded-lg"
            draggable={false}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center rounded-lg bg-muted py-12 text-sm text-muted-foreground">
            Failed to load image
          </div>
        )}
        {editor.isEditable && (
          <div className="image-block-resize" contentEditable={false}>
            {[25, 50, 75, 100].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => updateAttributes({ width: w })}
                className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                  attrs.width === w
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {w}%
              </button>
            ))}
          </div>
        )}
        {editor.isEditable ? (
          <input
            type="text"
            value={attrs.caption}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            placeholder="Add a caption..."
            className="image-block-caption"
          />
        ) : (
          attrs.caption && (
            <p className="image-block-caption-readonly">{attrs.caption}</p>
          )
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      width: { default: 100 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type=\"image-block\"]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },

  addCommands() {
    return {
      setImageBlock:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
