"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
import katex from "katex";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (attrs?: { latex?: string }) => ReturnType;
    };
    mathInline: {
      setMathInline: (attrs?: { latex?: string }) => ReturnType;
    };
  }
}

function MathBlockView({ node, updateAttributes, editor, selected }: NodeViewProps) {
  const latex = (node.attrs as { latex: string }).latex || "";
  const [editing, setEditing] = useState(!latex);
  const [input, setInput] = useState(latex);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing && latex && renderRef.current) {
      try {
        katex.render(latex, renderRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        renderRef.current.textContent = latex;
      }
    }
  }, [editing, latex]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = input.trim();
    if (trimmed) {
      updateAttributes({ latex: trimmed });
      setEditing(false);
    }
  };

  if (editing && editor.isEditable) {
    return (
      <NodeViewWrapper>
        <div className="math-block math-editing">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                if (latex) setEditing(false);
              }
            }}
            placeholder="E = mc^2"
            className="math-editor-input"
            rows={2}
          />
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] text-muted-foreground">
              Ctrl+Enter to save
            </span>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        className={`math-block math-display${selected ? " math-selected" : ""}`}
        onClick={() => editor.isEditable && setEditing(true)}
        title={editor.isEditable ? "Click to edit" : undefined}
      >
        {latex ? (
          <div ref={renderRef} />
        ) : (
          <span className="text-sm text-muted-foreground">
            Click to add equation
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function MathInlineView({ node, updateAttributes, editor, selected }: NodeViewProps) {
  const latex = (node.attrs as { latex: string }).latex || "";
  const [editing, setEditing] = useState(!latex);
  const [input, setInput] = useState(latex);
  const inputRef = useRef<HTMLInputElement>(null);
  const renderRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!editing && latex && renderRef.current) {
      try {
        katex.render(latex, renderRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        renderRef.current.textContent = latex;
      }
    }
  }, [editing, latex]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = input.trim();
    if (trimmed) {
      updateAttributes({ latex: trimmed });
      setEditing(false);
    }
  };

  if (editing && editor.isEditable) {
    return (
      <NodeViewWrapper as="span" className="math-inline math-editing-inline">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              if (latex) setEditing(false);
            }
          }}
          onBlur={handleSave}
          placeholder="x^2"
          className="math-inline-input"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span">
      <span
        className={`math-inline${selected ? " math-selected" : ""}`}
        onClick={() => editor.isEditable && setEditing(true)}
        title={editor.isEditable ? "Click to edit" : undefined}
        ref={renderRef}
      >
        {!latex && <span className="text-muted-foreground">equation</span>}
      </span>
    </NodeViewWrapper>
  );
}

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes.latex || "";
    return [
      "div",
      mergeAttributes({ "data-math-block": "", class: "math-block math-display" }, HTMLAttributes),
      latex,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addCommands() {
    return {
      setMathBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes.latex || "";
    return [
      "span",
      mergeAttributes({ "data-math-inline": "", class: "math-inline" }, HTMLAttributes),
      latex,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView);
  },

  addCommands() {
    return {
      setMathInline:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
