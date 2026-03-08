"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FileText, Upload, Link2, ExternalLink, Download, Loader2 } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pdfBlock: {
      setPdfBlock: (attrs?: { src?: string }) => ReturnType;
    };
  }
}

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function PdfBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const attrs = node.attrs as { src: string | null; fileName: string };
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getStorageUrl);

  const handleUpload = async (file: globalThis.File) => {
    if (file.size > MAX_PDF_SIZE) {
      alert("File too large. Maximum size is 20MB.");
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
        updateAttributes({ src: servingUrl, fileName: file.name });
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
      updateAttributes({ src: urlInput, fileName: "" });
    }
  };

  // Empty state
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
                accept=".pdf,application/pdf"
                aria-label="Upload PDF file"
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
                  <FileText className="h-5 w-5" />
                )}
                {uploading ? "Uploading..." : "Click to upload a PDF"}
              </button>
            </>
          )}
          {tab === "url" && (
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste PDF URL..."
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

  // Loaded state — iframe PDF viewer
  return (
    <NodeViewWrapper>
      <div className="pdf-block my-2">
        <div className="pdf-block-toolbar">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="pdf-block-filename">
            {attrs.fileName || "PDF Document"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <a
              href={attrs.src}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-block-action"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={attrs.src}
              download={attrs.fileName || "document.pdf"}
              className="pdf-block-action"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        <iframe
          src={attrs.src}
          title={attrs.fileName || "PDF Document"}
          className="pdf-block-iframe"
        >
          Your browser does not support PDF preview.
        </iframe>
      </div>
    </NodeViewWrapper>
  );
}

export const PdfBlock = Node.create({
  name: "pdfBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      fileName: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-pdf-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-pdf-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfBlockView);
  },

  addCommands() {
    return {
      setPdfBlock:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
