"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FileText, ChevronRight, Loader2 } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    subPage: {
      setSubPage: (attrs?: {
        pageId?: string;
        pageTitle?: string;
        pageIcon?: string;
      }) => ReturnType;
    };
  }
}

// Module-level context — set by editor, read by NodeView
let subPageContext: {
  workspaceId: Id<"workspaces">;
  documentId: Id<"documents">;
} | null = null;

export function setSubPageContext(
  ctx: { workspaceId: Id<"workspaces">; documentId: Id<"documents"> } | null
) {
  subPageContext = ctx;
}

function SubPageView({ node, updateAttributes, editor }: NodeViewProps) {
  const { pageId, pageTitle, pageIcon } = node.attrs as {
    pageId: string | null;
    pageTitle: string;
    pageIcon: string;
  };
  const createDoc = useMutation(api.documents.create);
  const creatingRef = useRef(false);

  // Auto-create child document on mount when no pageId
  useEffect(() => {
    if (pageId || creatingRef.current || !editor.isEditable) return;
    if (!subPageContext) return;

    creatingRef.current = true;
    const { workspaceId, documentId } = subPageContext;

    createDoc({
      title: "Untitled",
      workspaceId,
      parentDocumentId: documentId,
    }).then((newId) => {
      updateAttributes({
        pageId: newId,
        pageTitle: "Untitled",
        pageIcon: "",
      });
    }).catch(() => {
      creatingRef.current = false;
    });
  }, [pageId]);

  // Creating state
  if (!pageId) {
    return (
      <NodeViewWrapper>
        <div className="sub-page-card sub-page-creating">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Creating page...</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded state
  const handleClick = () => {
    window.open(`/documents/${pageId}`, "_blank");
  };

  return (
    <NodeViewWrapper>
      <div
        className="sub-page-card"
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleClick();
        }}
      >
        <span className="sub-page-icon">
          {pageIcon || <FileText className="h-4 w-4" />}
        </span>
        <span className="sub-page-title">{pageTitle || "Untitled"}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
      </div>
    </NodeViewWrapper>
  );
}

export const SubPage = Node.create({
  name: "subPage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pageId: { default: null },
      pageTitle: { default: "" },
      pageIcon: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-sub-page]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes.pageTitle || "Page";
    const pageId = HTMLAttributes.pageId;
    return [
      "div",
      mergeAttributes({ "data-sub-page": "" }, HTMLAttributes),
      ["a", { href: pageId ? `/documents/${pageId}` : "#" }, title],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SubPageView);
  },

  addCommands() {
    return {
      setSubPage:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
