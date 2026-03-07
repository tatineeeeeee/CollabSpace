export function sanitizeFilename(title: string): string {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "untitled";
}

export function downloadAsFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
