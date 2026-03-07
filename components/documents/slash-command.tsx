"use client";

import {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Extension } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  Info,
  AlertTriangle,
  CircleCheck,
  Ban,
  ImageIcon,
  Table as TableIcon,
  ChevronRight,
  TableOfContents as TableOfContentsIcon,
  Video,
  Globe,
  Columns2,
  Columns3,
  Paintbrush,
  Palette,
  Calendar,
  AtSign,
  SmilePlus,
  Copy,
  Trash2,
  Highlighter,
  Sigma,
  Bookmark,
  Music,
  FileText,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  command: (editor: Editor, range: Range) => void;
}

interface SlashCommandCategory {
  label: string;
  items: SlashCommandItem[];
}

const SLASH_COMMAND_CATEGORIES: SlashCommandCategory[] = [
  {
    label: "Basic blocks",
    items: [
      {
        title: "Text",
        description: "Plain paragraph text",
        icon: Type,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setParagraph().run(),
      },
      {
        title: "Heading 1",
        description: "Large section heading",
        icon: Heading1,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
      },
      {
        title: "Heading 2",
        description: "Medium section heading",
        icon: Heading2,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
      },
      {
        title: "Heading 3",
        description: "Small section heading",
        icon: Heading3,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
      },
      {
        title: "Bullet List",
        description: "Unordered list with bullets",
        icon: List,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleBulletList().run(),
      },
      {
        title: "Numbered List",
        description: "Ordered list with numbers",
        icon: ListOrdered,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
      },
      {
        title: "Task List",
        description: "Checklist with checkboxes",
        icon: ListTodo,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleTaskList().run(),
      },
      {
        title: "Toggle",
        description: "Collapsible content block",
        icon: ChevronRight,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setToggle().run(),
      },
      {
        title: "Toggle Heading 1",
        description: "Collapsible large heading",
        icon: Heading1,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setToggleHeading({ level: 1 }).run(),
      },
      {
        title: "Toggle Heading 2",
        description: "Collapsible medium heading",
        icon: Heading2,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setToggleHeading({ level: 2 }).run(),
      },
      {
        title: "Toggle Heading 3",
        description: "Collapsible small heading",
        icon: Heading3,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setToggleHeading({ level: 3 }).run(),
      },
      {
        title: "Quote",
        description: "Block quote for citations",
        icon: Quote,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setBlockquote().run(),
      },
      {
        title: "Divider",
        description: "Horizontal separator line",
        icon: Minus,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
      },
    ],
  },
  {
    label: "Media",
    items: [
      {
        title: "Image",
        description: "Embed an image from URL",
        icon: ImageIcon,
        command: (editor, range) => {
          const url = window.prompt("Image URL");
          if (url) {
            editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
          }
        },
      },
      {
        title: "YouTube",
        description: "Embed a YouTube video",
        icon: Video,
        command: (editor, range) => {
          const url = window.prompt("YouTube URL");
          if (url) {
            editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
          }
        },
      },
      {
        title: "Embed",
        description: "Embed external content",
        icon: Globe,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "embed" })
            .run(),
      },
      {
        title: "Audio",
        description: "Embed an audio file",
        icon: Music,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "audioBlock" })
            .run(),
      },
      {
        title: "Video File",
        description: "Embed a video file",
        icon: Video,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "videoBlock" })
            .run(),
      },
      {
        title: "Bookmark",
        description: "Rich link preview card",
        icon: Bookmark,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "bookmark" })
            .run(),
      },
    ],
  },
  {
    label: "Advanced",
    items: [
      {
        title: "Callout",
        description: "Highlighted info box",
        icon: Info,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCallout({ type: "info" }).run(),
      },
      {
        title: "Warning Callout",
        description: "Yellow warning box",
        icon: AlertTriangle,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCallout({ type: "warning" }).run(),
      },
      {
        title: "Success Callout",
        description: "Green success box",
        icon: CircleCheck,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCallout({ type: "success" }).run(),
      },
      {
        title: "Error Callout",
        description: "Red error box",
        icon: Ban,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCallout({ type: "error" }).run(),
      },
      {
        title: "Code Block",
        description: "Code snippet block",
        icon: Code,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCodeBlock().run(),
      },
      {
        title: "Table",
        description: "Insert a table",
        icon: TableIcon,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
      },
      {
        title: "Table of Contents",
        description: "Auto-generated from headings",
        icon: TableOfContentsIcon,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "tableOfContents" })
            .run(),
      },
      {
        title: "Equation",
        description: "LaTeX math equation block",
        icon: Sigma,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "mathBlock" })
            .run(),
      },
      {
        title: "Inline Equation",
        description: "Inline LaTeX math",
        icon: Sigma,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "mathInline" })
            .run(),
      },
      {
        title: "Link to Page",
        description: "Link to another document",
        icon: FileText,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "linkToPage" })
            .run(),
      },
      {
        title: "2 Columns",
        description: "Side-by-side layout",
        icon: Columns2,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColumns({ count: 2 }).run(),
      },
      {
        title: "3 Columns",
        description: "Three-column layout",
        icon: Columns3,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColumns({ count: 3 }).run(),
      },
    ],
  },
  {
    label: "Turn into",
    items: [
      {
        title: "Turn into Heading 1",
        description: "Convert to large heading",
        icon: Heading1,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
      },
      {
        title: "Turn into Heading 2",
        description: "Convert to medium heading",
        icon: Heading2,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
      },
      {
        title: "Turn into Heading 3",
        description: "Convert to small heading",
        icon: Heading3,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
      },
      {
        title: "Turn into Bullet List",
        description: "Convert to bullet list",
        icon: List,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleBulletList().run(),
      },
      {
        title: "Turn into Numbered List",
        description: "Convert to numbered list",
        icon: ListOrdered,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
      },
      {
        title: "Turn into Quote",
        description: "Convert to blockquote",
        icon: Quote,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setBlockquote().run(),
      },
      {
        title: "Turn into Callout",
        description: "Convert to callout box",
        icon: Info,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCallout({ type: "info" }).run(),
      },
      {
        title: "Turn into Code Block",
        description: "Convert to code snippet",
        icon: Code,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setCodeBlock().run(),
      },
    ],
  },
  {
    label: "Color",
    items: [
      {
        title: "Red",
        description: "Red text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#ef4444").run(),
      },
      {
        title: "Blue",
        description: "Blue text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#3b82f6").run(),
      },
      {
        title: "Green",
        description: "Green text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#22c55e").run(),
      },
      {
        title: "Orange",
        description: "Orange text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#f97316").run(),
      },
      {
        title: "Purple",
        description: "Purple text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#a855f7").run(),
      },
      {
        title: "Yellow",
        description: "Yellow text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#eab308").run(),
      },
      {
        title: "Pink",
        description: "Pink text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#ec4899").run(),
      },
      {
        title: "Gray",
        description: "Gray text color",
        icon: Paintbrush,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).setColor("#6b7280").run(),
      },
      {
        title: "Default Color",
        description: "Remove text color",
        icon: Palette,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).unsetColor().run(),
      },
    ],
  },
  {
    label: "Background",
    items: [
      {
        title: "Red Background",
        description: "Red text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#fef2f2" }).run(),
      },
      {
        title: "Blue Background",
        description: "Blue text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#dbeafe" }).run(),
      },
      {
        title: "Green Background",
        description: "Green text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#dcfce7" }).run(),
      },
      {
        title: "Yellow Background",
        description: "Yellow text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#fef9c3" }).run(),
      },
      {
        title: "Orange Background",
        description: "Orange text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#fef3c7" }).run(),
      },
      {
        title: "Purple Background",
        description: "Purple text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#f3e8ff" }).run(),
      },
      {
        title: "Pink Background",
        description: "Pink text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#fce7f3" }).run(),
      },
      {
        title: "Gray Background",
        description: "Gray text background",
        icon: Highlighter,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#f1f1ef" }).run(),
      },
      {
        title: "Default Background",
        description: "Remove background color",
        icon: Palette,
        command: (editor, range) =>
          editor.chain().focus().deleteRange(range).unsetHighlight().run(),
      },
    ],
  },
  {
    label: "Inline",
    items: [
      {
        title: "Mention Page",
        description: "Reference another page",
        icon: AtSign,
        command: (editor, range) => {
          editor.chain().focus().deleteRange(range).run();
          editor.chain().focus().insertContent("@").run();
        },
      },
      {
        title: "Mention Person",
        description: "Mention a workspace member",
        icon: UserRound,
        command: (editor, range) => {
          editor.chain().focus().deleteRange(range).run();
          editor.chain().focus().insertContent("#").run();
        },
      },
      {
        title: "Date",
        description: "Insert inline date with picker",
        icon: Calendar,
        command: (editor, range) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "dateMention", attrs: { date: new Date().toISOString() } })
            .run(),
      },
      {
        title: "Emoji",
        description: "Insert an emoji",
        icon: SmilePlus,
        command: (editor, range) => {
          const emojis = ["😀", "👍", "🎉", "🔥", "💡", "⭐", "✅", "❤️", "🚀", "📝"];
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          editor.chain().focus().deleteRange(range).insertContent(emoji).run();
        },
      },
    ],
  },
  {
    label: "Actions",
    items: [
      {
        title: "Duplicate Block",
        description: "Copy current block below",
        icon: Copy,
        command: (editor, range) => {
          editor.chain().focus().deleteRange(range).run();
          const { from } = editor.state.selection;
          const node = editor.state.doc.resolve(from).parent;
          if (node) {
            editor.chain().focus().insertContentAt(
              editor.state.selection.to,
              node.toJSON()
            ).run();
          }
        },
      },
      {
        title: "Delete Block",
        description: "Remove current block",
        icon: Trash2,
        command: (editor, range) => {
          editor.chain().focus().deleteRange(range).deleteNode("paragraph").run();
        },
      },
    ],
  },
];

// Flat list for suggestion plugin filtering
const SLASH_COMMANDS: SlashCommandItem[] = SLASH_COMMAND_CATEGORIES.flatMap(
  (cat) => cat.items
);

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

interface SlashCommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const onItemsChange = useEffectEvent(() => {
      setSelectedIndex(0);
    });

    useEffect(() => {
      onItemsChange();
    }, [items]);

    useEffect(() => {
      const selected = containerRef.current?.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selected?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border bg-popover p-2 shadow-lg">
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No results
          </p>
        </div>
      );
    }

    // Build categorized view: only show categories that have matching items
    const categorized = SLASH_COMMAND_CATEGORIES
      .map((cat) => ({
        label: cat.label,
        items: cat.items.filter((ci) => items.some((i) => i.title === ci.title)),
      }))
      .filter((cat) => cat.items.length > 0);

    // Build a flat index map for keyboard navigation
    let flatIndex = 0;
    const indexMap = new Map<string, number>();
    for (const cat of categorized) {
      for (const item of cat.items) {
        indexMap.set(item.title, flatIndex++);
      }
    }

    return (
      <div
        ref={containerRef}
        className="z-50 max-h-80 w-80 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-xl"
      >
        {categorized.map((cat) => (
          <div key={cat.label}>
            <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.label}
            </div>
            {cat.items.map((item) => {
              const idx = indexMap.get(item.title) ?? 0;
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.title}
                  data-index={idx}
                  onClick={() => command(item)}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);

SlashCommandList.displayName = "SlashCommandList";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        startOfLine: false,
        allowedPrefixes: null,
        items: ({ query }: { query: string }) => {
          return SLASH_COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.command(editor, range);
        },
        render: () => {
          let component: ReactRenderer<SlashCommandListRef> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              popup = document.createElement("div");
              popup.style.position = "absolute";
              popup.style.zIndex = "50";
              document.body.appendChild(popup);

              component = new ReactRenderer(SlashCommandList, {
                props: {
                  items: props.items,
                  command: props.command,
                },
                editor: props.editor,
              });

              if (component.element && popup) {
                popup.appendChild(component.element);
              }

              const rect = props.clientRect?.();
              if (rect && popup) {
                popup.style.left = `${rect.left + window.scrollX}px`;
                popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
              }
            },

            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              component?.updateProps({
                items: props.items,
                command: props.command,
              });

              const rect = props.clientRect?.();
              if (rect && popup) {
                popup.style.left = `${rect.left + window.scrollX}px`;
                popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
              }
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup?.remove();
                popup = null;
                component?.destroy();
                component = null;
                return true;
              }

              return (
                component?.ref?.onKeyDown(props) ?? false
              );
            },

            onExit: () => {
              popup?.remove();
              popup = null;
              component?.destroy();
              component = null;
            },
          };
        },
      } as Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
