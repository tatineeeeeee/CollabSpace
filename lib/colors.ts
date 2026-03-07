/** Label colors used on kanban cards */
export const LABEL_COLORS = [
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Yellow", color: "#eab308" },
  { name: "Green", color: "#22c55e" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Purple", color: "#a855f7" },
  { name: "Pink", color: "#ec4899" },
] as const;

/** Cover color swatches for kanban cards */
export const CARD_COVER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#6366f1", "#64748b",
] as const;

/** List header bar colors (Trello-style) */
export const LIST_COLORS = [
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Lime", value: "#84cc16" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#64748b" },
] as const;

/** Board background solid colors */
export const BOARD_COLORS = [
  { label: "Blue", value: "#0079bf" },
  { label: "Purple", value: "#89609e" },
  { label: "Green", value: "#519839" },
  { label: "Orange", value: "#d29034" },
  { label: "Red", value: "#b04632" },
  { label: "Pink", value: "#cd5a91" },
  { label: "Teal", value: "#00897b" },
  { label: "Sky", value: "#00aecc" },
  { label: "Lime", value: "#838c00" },
  { label: "Slate", value: "#505f79" },
] as const;

/** Background highlight colors (Notion-style text backgrounds) */
export const HIGHLIGHT_BACKGROUND_COLORS = [
  { name: "Default", color: "" },
  { name: "Gray", color: "#f1f1ef", dark: "#2f2f2f" },
  { name: "Brown", color: "#f4eeee", dark: "#3a2e2b" },
  { name: "Orange", color: "#fef3c7", dark: "#422006" },
  { name: "Yellow", color: "#fef9c3", dark: "#422006" },
  { name: "Green", color: "#dcfce7", dark: "#052e16" },
  { name: "Blue", color: "#dbeafe", dark: "#172554" },
  { name: "Purple", color: "#f3e8ff", dark: "#2e1065" },
  { name: "Pink", color: "#fce7f3", dark: "#500724" },
  { name: "Red", color: "#fef2f2", dark: "#450a0a" },
] as const;

/** Document cover solid colors */
export const COVER_SOLID_COLORS = [
  "#2C3E50", "#8E44AD", "#2980B9", "#16A085", "#27AE60",
  "#F39C12", "#D35400", "#C0392B", "#7F8C8D", "#34495E",
] as const;
