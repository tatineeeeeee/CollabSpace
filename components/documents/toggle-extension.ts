import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleDetails: {
      setToggle: () => ReturnType;
    };
  }
}

export const ToggleDetails = Node.create({
  name: "toggleDetails",
  group: "block",
  content: "toggleSummary block+",
  defining: true,

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { class: "toggle-details" }),
      0,
    ];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: "toggleSummary",
                content: [{ type: "text", text: "Toggle heading" }],
              },
              { type: "paragraph" },
            ],
          });
        },
    };
  },
});

export const ToggleSummary = Node.create({
  name: "toggleSummary",
  group: "",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, { class: "toggle-summary" }),
      0,
    ];
  },
});
