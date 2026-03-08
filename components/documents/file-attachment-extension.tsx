"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatFileSize } from "@/lib/utils";
import {
  Paperclip,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  File,
  Download,
  Loader2,
} from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (attrs?: { src?: string }) => ReturnType;
    };
  }
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf") return FileText;
  if (/application\/(zip|gzip|x-tar|x-rar|x-7z)/.test(mimeType)) return FileArchive;
  return File;
}

function FileAttachmentView({ node, updateAttributes, editor }: NodeViewProps) {
  const attrs = node.attrs as {
    src: string | null;
    fileName: string;
    fileSize: number;
    fileType: string;
  };
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getStorageUrl = useMutation(api.files.getStorageUrl);

  const handleUpload = async (file: globalThis.File) => {
    if (file.size > MAX_FILE_SIZE) {
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
        updateAttributes({
          src: servingUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
        });
      }
    } catch {
      // upload failed
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Empty state
  if (!attrs.src) {
    if (!editor.isEditable) return null;

    return (
      <NodeViewWrapper>
        <div className="my-2">
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Upload file"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
            {uploading ? "Uploading..." : "Click to upload a file"}
          </button>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Max file size: 20MB
          </p>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded state
  const Icon = getFileIcon(attrs.fileType);

  return (
    <NodeViewWrapper>
      <a
        href={attrs.src}
        target="_blank"
        rel="noopener noreferrer"
        className="file-attachment-card"
      >
        <div className="file-attachment-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="file-attachment-info">
          <span className="file-attachment-name">{attrs.fileName || "File"}</span>
          {attrs.fileSize > 0 && (
            <span className="file-attachment-size">
              {formatFileSize(attrs.fileSize)}
            </span>
          )}
        </div>
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
    </NodeViewWrapper>
  );
}

export const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      fileName: { default: "" },
      fileSize: { default: 0 },
      fileType: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-file-attachment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-file-attachment": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView);
  },

  addCommands() {
    return {
      setFileAttachment:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
