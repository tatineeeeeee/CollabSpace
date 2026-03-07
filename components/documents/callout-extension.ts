import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "warning" | "success" | "error";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-callout-type") || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type || "info",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes["data-callout-type"] || "info";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        "data-callout-type": type,
        class: `callout callout-${type}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.setNode(this.name, { type: attrs?.type ?? "info" });
        },
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, "paragraph", {
            type: attrs?.type ?? "info",
          });
        },
    };
  },
});
