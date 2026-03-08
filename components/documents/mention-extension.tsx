"use client";

import {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { computePosition, flip, shift, offset, autoUpdate } from "@floating-ui/dom";
import { FileText } from "lucide-react";
import { IconRenderer } from "@/components/shared/icon-renderer";

export interface MentionDocument {
  id: string;
  title: string;
  icon?: string;
}

interface MentionListProps {
  items: MentionDocument[];
  command: (item: MentionDocument) => void;
}

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
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
            No pages found
          </p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="z-50 max-h-[300px] w-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            data-index={index}
            onClick={() => command(item)}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent/50"
            }`}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-sm">
              <IconRenderer icon={item.icon ?? ""} className="h-3.5 w-3.5 text-sm" fallback={<FileText className="h-3.5 w-3.5" />} />
            </div>
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";

export function createMentionExtension(getDocuments: () => MentionDocument[]) {
  return Mention.extend({
    renderHTML({ node, HTMLAttributes }) {
      return [
        "a",
        {
          ...HTMLAttributes,
          href: `/documents/${node.attrs.id}`,
          "data-mention": "",
          "data-id": node.attrs.id,
        },
        `@${node.attrs.label ?? node.attrs.id}`,
      ];
    },
  }).configure({
    HTMLAttributes: {
      class: "mention",
    },
    suggestion: {
      char: "@",
      allowedPrefixes: null,
      items: ({ query }: { query: string }) => {
        return getDocuments()
          .filter((doc) =>
            doc.title.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
        const doc = props as MentionDocument;
        const ed = editor as import("@tiptap/core").Editor;
        const rng = range as import("@tiptap/core").Range;
        ed.chain()
          .focus()
          .deleteRange(rng)
          .insertContent([
            {
              type: "mention",
              attrs: { id: doc.id, label: doc.title },
            },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: HTMLDivElement | null = null;
        let cleanupAutoUpdate: (() => void) | null = null;
        let latestClientRect: (() => DOMRect | null) | null = null;

        function updatePosition() {
          if (!popup || !latestClientRect) return;
          const virtualEl = {
            getBoundingClientRect: () => latestClientRect?.() ?? new DOMRect(),
          };
          computePosition(virtualEl, popup, {
            strategy: "fixed",
            placement: "bottom-start",
            middleware: [
              offset(4),
              flip({ fallbackPlacements: ["top-start"] }),
              shift({ padding: 8 }),
            ],
          }).then(({ x, y }) => {
            if (!popup) return;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
          });
        }

        return {
          onStart: (props: SuggestionProps<MentionDocument>) => {
            popup = document.createElement("div");
            popup.style.position = "fixed";
            popup.style.zIndex = "9999";
            popup.style.width = "max-content";

            // Prevent editor blur on any pointer interaction with the popup
            const preventFocusLoss = (e: Event) => e.preventDefault();
            popup.addEventListener("mousedown", preventFocusLoss);
            popup.addEventListener("pointerdown", preventFocusLoss);

            document.body.appendChild(popup);

            component = new ReactRenderer(MentionList, {
              props: {
                items: props.items,
                command: props.command,
              },
              editor: props.editor,
            });

            if (component.element && popup) {
              popup.appendChild(component.element);
            }

            latestClientRect = props.clientRect ?? null;
            updatePosition();

            // Auto-update position on scroll/resize
            const virtualEl = {
              getBoundingClientRect: () => latestClientRect?.() ?? new DOMRect(),
            };
            cleanupAutoUpdate = autoUpdate(virtualEl, popup, updatePosition);
          },

          onUpdate: (props: SuggestionProps<MentionDocument>) => {
            component?.updateProps({
              items: props.items,
              command: props.command,
            });

            latestClientRect = props.clientRect ?? null;
            updatePosition();
          },

          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === "Escape") {
              cleanupAutoUpdate?.();
              cleanupAutoUpdate = null;
              popup?.remove();
              popup = null;
              component?.destroy();
              component = null;
              return true;
            }

            return component?.ref?.onKeyDown(props) ?? false;
          },

          onExit: () => {
            cleanupAutoUpdate?.();
            cleanupAutoUpdate = null;
            popup?.remove();
            popup = null;
            component?.destroy();
            component = null;
          },
        };
      },
    },
  });
}
