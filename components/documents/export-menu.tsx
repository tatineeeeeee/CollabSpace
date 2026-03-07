"use client";

import type { Editor } from "@tiptap/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileCode, FileType } from "lucide-react";
import { downloadAsFile, sanitizeFilename } from "@/lib/export-utils";

interface ExportMenuProps {
  editor: Editor;
  title: string;
}

export function ExportMenu({ editor, title }: ExportMenuProps) {
  const filename = sanitizeFilename(title);

  const exportMarkdown = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText();
    downloadAsFile(md, `${filename}.md`, "text/markdown");
  };

  const exportHtml = () => {
    const body = editor.getHTML();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 768px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
h1 { font-size: 2rem; margin-top: 2rem; }
h2 { font-size: 1.5rem; margin-top: 1.5rem; }
h3 { font-size: 1.25rem; margin-top: 1.25rem; }
blockquote { border-left: 3px solid #d1d5db; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
code { background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; }
th { background: #f3f4f6; font-weight: 600; }
img { max-width: 100%; border-radius: 0.5rem; }
ul[data-type="taskList"] { list-style: none; padding-left: 0; }
ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; }
</style>
</head>
<body>
${body}
</body>
</html>`;
    downloadAsFile(html, `${filename}.html`, "text/html");
  };

  const exportText = () => {
    const text = editor.getText();
    downloadAsFile(text, `${filename}.txt`, "text/plain");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportMarkdown}>
          <FileText className="mr-2 h-4 w-4" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportHtml}>
          <FileCode className="mr-2 h-4 w-4" />
          HTML (.html)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportText}>
          <FileType className="mr-2 h-4 w-4" />
          Plain Text (.txt)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
