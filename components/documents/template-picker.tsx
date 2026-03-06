"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOCUMENT_TEMPLATES } from "@/lib/document-templates";
import { FileText } from "lucide-react";
import type { DocumentTemplate } from "@/lib/document-templates";

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: DocumentTemplate | null) => void;
}

export function TemplatePicker({ open, onOpenChange, onSelect }: TemplatePickerProps) {
  const handleSelect = (template: DocumentTemplate | null) => {
    onSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a document</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Blank page</p>
              <p className="text-xs text-muted-foreground">Start from scratch</p>
            </div>
          </button>
          {DOCUMENT_TEMPLATES.map((template) => (
            <button
              type="button"
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
            >
              <span className="text-2xl">{template.icon}</span>
              <div>
                <p className="text-sm font-medium">{template.title}</p>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
