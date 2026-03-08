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
import { User } from "lucide-react";

export interface MentionUser {
  id: string;
  name: string;
  imageUrl?: string;
}

interface UserMentionListProps {
  items: MentionUser[];
  command: (item: MentionUser) => void;
}

interface UserMentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const UserMentionList = forwardRef<UserMentionListRef, UserMentionListProps>(
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
            No members found
          </p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="z-50 max-h-[300px] w-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
      >
        <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          People
        </div>
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
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="truncate">{item.name}</span>
          </button>
        ))}
      </div>
    );
  }
);

UserMentionList.displayName = "UserMentionList";

export function createUserMentionExtension(getUsers: () => MentionUser[]) {
  return Mention.extend({
    name: "userMention",

    renderHTML({ node, HTMLAttributes }) {
      return [
        "span",
        {
          ...HTMLAttributes,
          "data-user-mention": "",
          "data-id": node.attrs.id,
        },
        `@${node.attrs.label ?? "user"}`,
      ];
    },
  }).configure({
    HTMLAttributes: {
      class: "user-mention",
    },
    suggestion: {
      char: "#",
      allowedPrefixes: null,
      items: ({ query }: { query: string }) => {
        return getUsers()
          .filter((u) =>
            u.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
        const user = props as MentionUser;
        const ed = editor as import("@tiptap/core").Editor;
        const rng = range as import("@tiptap/core").Range;
        ed.chain()
          .focus()
          .deleteRange(rng)
          .insertContent([
            {
              type: "userMention",
              attrs: { id: user.id, label: user.name },
            },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => {
        let component: ReactRenderer<UserMentionListRef> | null = null;
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
          onStart: (props: SuggestionProps<MentionUser>) => {
            popup = document.createElement("div");
            popup.style.position = "fixed";
            popup.style.zIndex = "9999";
            popup.style.width = "max-content";

            // Prevent editor blur on any pointer interaction with the popup
            const preventFocusLoss = (e: Event) => e.preventDefault();
            popup.addEventListener("mousedown", preventFocusLoss);
            popup.addEventListener("pointerdown", preventFocusLoss);

            document.body.appendChild(popup);

            component = new ReactRenderer(UserMentionList, {
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

          onUpdate: (props: SuggestionProps<MentionUser>) => {
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
