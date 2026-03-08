import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockBackground: {
      setBlockBackground: (color: string | null) => ReturnType;
    };
  }
}

/**
 * Adds a block-level backgroundColor attribute to paragraphs and headings.
 * Uses data-bg-color attribute + CSS (with dark mode support in globals.css).
 * This gives Notion-style full-width block backgrounds, not inline text highlights.
 */
export const BlockBackground = Extension.create({
  name: "blockBackground",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          backgroundColor: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute("data-bg-color") || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {};
              return { "data-bg-color": attributes.backgroundColor };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockBackground:
        (color) =>
        ({ tr, dispatch }) => {
          const { $from } = tr.selection;
          const node = $from.parent;
          const pos = $from.before($from.depth);
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                backgroundColor: color,
              });
            }
            return true;
          }
          return false;
        },
    };
  },
});
