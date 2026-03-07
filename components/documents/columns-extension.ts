import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      setColumns: (attrs: { count: number }) => ReturnType;
    };
  }
}

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  defining: true,

  addAttributes() {
    return {
      count: { default: 2 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-columns]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const count = HTMLAttributes.count || 2;
    return [
      "div",
      mergeAttributes(
        { "data-columns": count, class: "columns-wrapper" },
        { ...HTMLAttributes, count: undefined }
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
  content: "block+",
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
