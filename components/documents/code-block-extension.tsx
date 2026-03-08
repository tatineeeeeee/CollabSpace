"use client";

import { useState } from "react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { Check, Copy } from "lucide-react";

const lowlight = createLowlight(common);

const LANGUAGES = [
  { value: "", label: "Plain text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "markdown", label: "Markdown" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
  { value: "graphql", label: "GraphQL" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "csharp", label: "C#" },
  { value: "scss", label: "SCSS" },
  { value: "shell", label: "Shell" },
  { value: "diff", label: "Diff" },
  { value: "makefile", label: "Makefile" },
  { value: "lua", label: "Lua" },
  { value: "perl", label: "Perl" },
  { value: "r", label: "R" },
  { value: "wasm", label: "WebAssembly" },
];

function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs as { language: string | null }).language ?? "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = node.textContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="code-block-wrapper">
      {editor.isEditable && (
        <div className="code-block-toolbar" contentEditable={false}>
          <select
            value={language}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            className="code-block-lang-select"
            aria-label="Code language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCopy}
            className="code-block-copy-btn"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      {!editor.isEditable && (
        <div className="code-block-toolbar code-block-toolbar-readonly" contentEditable={false}>
          {language && (
            <span className="code-block-lang-label">
              {LANGUAGES.find((l) => l.value === language)?.label ?? language}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="code-block-copy-btn"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <pre>
        <NodeViewContent className="hljs" />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
});
