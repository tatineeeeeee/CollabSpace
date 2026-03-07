"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dateMention: {
      setDateMention: (attrs?: { date?: string }) => ReturnType;
    };
  }
}

function DateMentionView({ node, updateAttributes, editor, selected }: NodeViewProps) {
  const dateStr = (node.attrs as { date: string }).date;
  const [open, setOpen] = useState(false);

  const date = dateStr ? new Date(dateStr) : new Date();
  const formatted = format(date, "MMM d, yyyy");

  if (!editor.isEditable) {
    return (
      <NodeViewWrapper as="span">
        <span className="date-mention">
          <CalendarIcon className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
          {formatted}
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <span
            className={`date-mention${selected ? " date-mention-selected" : ""}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}
          >
            <CalendarIcon className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
            {formatted}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                updateAttributes({ date: d.toISOString() });
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

export const DateMention = Node.create({
  name: "dateMention",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      date: { default: new Date().toISOString() },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-date-mention]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const dateStr = HTMLAttributes.date;
    let formatted = "Date";
    try {
      formatted = format(new Date(dateStr), "MMM d, yyyy");
    } catch { /* fallback */ }
    return [
      "span",
      mergeAttributes({ "data-date-mention": "", class: "date-mention" }, HTMLAttributes),
      formatted,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateMentionView);
  },

  addCommands() {
    return {
      setDateMention:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { date: attrs?.date ?? new Date().toISOString() },
          });
        },
    };
  },
});
