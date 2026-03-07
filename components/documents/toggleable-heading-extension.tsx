"use client";

import Heading from "@tiptap/extension-heading";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ChevronRight } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleableHeading: {
      setToggleHeading: (attrs: { level: 1 | 2 | 3 }) => ReturnType;
    };
  }
}

function HeadingView({ node, updateAttributes, editor }: NodeViewProps) {
  const { level, isToggle, isOpen } = node.attrs as {
    level: number;
    isToggle: boolean;
    isOpen: boolean;
  };

  const Tag = `h${level}` as "h1" | "h2" | "h3";

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggle) {
      updateAttributes({ isOpen: !isOpen });
    } else {
      // First click makes it toggleable
      updateAttributes({ isToggle: true, isOpen: true });
    }
  };

  return (
    <NodeViewWrapper as={Tag} data-heading-level={level}>
      {isToggle && (
        <button
          type="button"
          className="heading-toggle-btn"
          onClick={handleToggleClick}
          contentEditable={false}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
      )}
      {!isToggle && editor.isEditable && (
        <button
          type="button"
          className="heading-toggle-btn heading-toggle-hint"
          onClick={handleToggleClick}
          contentEditable={false}
          aria-label="Make toggleable"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {/* @ts-expect-error -- NodeViewContent accepts any HTML tag */}
      <NodeViewContent as="span" />
    </NodeViewWrapper>
  );
}

const collapsePluginKey = new PluginKey("headingCollapse");

function createCollapsePlugin() {
  return new Plugin({
    key: collapsePluginKey,
    props: {
      decorations(state) {
        const { doc } = state;
        const decorations: Decoration[] = [];

        doc.forEach((node, pos) => {
          if (
            node.type.name === "heading" &&
            node.attrs.isToggle &&
            !node.attrs.isOpen
          ) {
            const headingLevel = node.attrs.level as number;
            const headingEnd = pos + node.nodeSize;

            // Find the range to hide: from the node after this heading
            // until the next heading of same or higher level (or end of doc)
            let hideEnd = headingEnd;
            let foundNext = false;

            doc.forEach((sibling, siblingPos) => {
              if (foundNext) return;
              if (siblingPos <= pos) return;

              if (
                sibling.type.name === "heading" &&
                (sibling.attrs.level as number) <= headingLevel
              ) {
                foundNext = true;
                hideEnd = siblingPos;
                return;
              }

              hideEnd = siblingPos + sibling.nodeSize;
            });

            // Add decorations to hide each node in the range
            doc.forEach((sibling, siblingPos) => {
              if (siblingPos < headingEnd || siblingPos >= hideEnd) return;
              decorations.push(
                Decoration.node(siblingPos, siblingPos + sibling.nodeSize, {
                  class: "heading-collapsed-content",
                })
              );
            });
          }
        });

        return DecorationSet.create(doc, decorations);
      },
    },
  });
}

export const ToggleableHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      isToggle: {
        default: false,
        parseHTML: (element) => element.hasAttribute("data-toggle"),
        renderHTML: (attributes) => {
          if (!attributes.isToggle) return {};
          return { "data-toggle": "" };
        },
      },
      isOpen: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => {
          if (!attributes.isToggle) return {};
          return { "data-open": attributes.isOpen ? "true" : "false" };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingView);
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), createCollapsePlugin()];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setToggleHeading:
        (attrs) =>
        ({ commands }) => {
          return commands.setHeading({
            level: attrs.level,
            // @ts-expect-error -- custom attributes
            isToggle: true,
            isOpen: true,
          });
        },
    };
  },
});
