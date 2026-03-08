import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      setColumns: (attrs: { count: number }) => ReturnType;
    };
  }
}

/**
 * Converts a widths string (e.g. "50,50" or "33.33,33.33,33.34") to a
 * CSS grid-template-columns value using fr units.
 * Falls back to equal distribution when widths is null/undefined.
 */
function widthsToGridTemplate(widths: string | null | undefined, count: number): string {
  if (widths) {
    const parts = widths.split(",").map(Number);
    if (parts.length >= 2 && parts.every((n) => !isNaN(n) && n > 0)) {
      return parts.map((w) => `${w}fr`).join(" ");
    }
  }
  return `repeat(${count}, 1fr)`;
}

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,}",
  defining: true,

  addAttributes() {
    return {
      count: { default: 2 },
      widths: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-columns]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const count = HTMLAttributes.count || 2;
    const widths = HTMLAttributes.widths;
    const gridCols = widthsToGridTemplate(widths, count);

    return [
      "div",
      mergeAttributes(
        {
          "data-columns": count,
          class: "columns-wrapper",
          style: `grid-template-columns: ${gridCols}`,
        },
        { ...HTMLAttributes, count: undefined, widths: undefined }
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setColumns:
        ({ count }) =>
        ({ commands }) => {
          const columnContent = Array.from({ length: count }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));

          return commands.insertContent({
            type: this.name,
            attrs: { count },
            content: columnContent,
          });
        },
    };
  },
});

export const Column = Node.create({
  name: "column",
  group: "",
  content: "block*",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-column]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-column": "", class: "column" }),
      0,
    ];
  },
});
