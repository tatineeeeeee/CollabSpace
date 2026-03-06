"use client";

import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useState } from "react";

interface TocHeading {
  level: number;
  text: string;
  id: string;
}

function TableOfContentsView({ editor }: { editor: Editor }) {
  const [headings, setHeadings] = useState<TocHeading[]>([]);

  useEffect(() => {
    const updateHeadings = () => {
      const items: TocHeading[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          items.push({
            level: node.attrs.level ?? 1,
            text: node.textContent,
            id: `heading-${pos}`,
          });
        }
      });
      setHeadings(items);
    };

    updateHeadings();
    editor.on("update", updateHeadings);
    return () => {
      editor.off("update", updateHeadings);
    };
  }, [editor]);

  return (
    <NodeViewWrapper>
      <div data-toc="" className="toc-block" contentEditable={false}>
        <p className="toc-title">Table of Contents</p>
        {headings.length === 0 ? (
          <p className="toc-empty">Add headings to generate a table of contents.</p>
        ) : (
          <ul className="toc-list">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className="toc-item"
                style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
              >
                <button
                  type="button"
                  className="toc-link"
                  onClick={() => {
                    const el = document.querySelector(`[data-toc-id="${heading.id}"]`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {heading.text || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: "div[data-toc]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-toc": "" }), "Table of Contents"];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsView);
  },
});
