import type { editor } from "monaco-editor";

/**
 * Custom Monaco theme: "CodeStudio Dark"
 * Warm stone tones with amber accents — matches our design system
 */
export const codeStudioTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "E7E5E4", background: "0C0A09" },
    { token: "comment", foreground: "78716C", fontStyle: "italic" },
    { token: "keyword", foreground: "F59E0B" },
    { token: "keyword.control", foreground: "F59E0B" },
    { token: "storage", foreground: "F59E0B" },
    { token: "storage.type", foreground: "F59E0B" },
    { token: "string", foreground: "A3E635" },
    { token: "string.escape", foreground: "86EFAC" },
    { token: "number", foreground: "FB923C" },
    { token: "constant", foreground: "FB923C" },
    { token: "type", foreground: "67E8F9" },
    { token: "type.identifier", foreground: "67E8F9" },
    { token: "class", foreground: "67E8F9" },
    { token: "interface", foreground: "67E8F9" },
    { token: "function", foreground: "C4B5FD" },
    { token: "function.call", foreground: "C4B5FD" },
    { token: "variable", foreground: "E7E5E4" },
    { token: "variable.parameter", foreground: "FDBA74" },
    { token: "property", foreground: "E7E5E4" },
    { token: "operator", foreground: "A8A29E" },
    { token: "delimiter", foreground: "A8A29E" },
    { token: "tag", foreground: "F87171" },
    { token: "attribute.name", foreground: "FBBF24" },
    { token: "attribute.value", foreground: "A3E635" },
    { token: "metatag", foreground: "78716C" },
    { token: "regexp", foreground: "F87171" },
  ],
  colors: {
    // Editor backgrounds
    "editor.background": "#0C0A09",
    "editor.foreground": "#E7E5E4",
    "editor.lineHighlightBackground": "#1C191720",
    "editor.selectionBackground": "#F59E0B30",
    "editor.selectionHighlightBackground": "#F59E0B15",
    "editor.wordHighlightBackground": "#F59E0B20",
    "editor.findMatchBackground": "#F59E0B40",
    "editor.findMatchHighlightBackground": "#F59E0B20",

    // Line numbers
    "editorLineNumber.foreground": "#44403C",
    "editorLineNumber.activeForeground": "#A8A29E",

    // Cursor
    "editorCursor.foreground": "#F59E0B",

    // Indentation guides
    "editorIndentGuide.background": "#1C1917",
    "editorIndentGuide.activeBackground": "#292524",

    // Bracket matching
    "editorBracketMatch.background": "#F59E0B20",
    "editorBracketMatch.border": "#F59E0B60",

    // Gutter
    "editorGutter.background": "#0C0A09",

    // Minimap
    "minimap.background": "#0C0A09",

    // Scrollbar
    "scrollbar.shadow": "#00000040",
    "scrollbarSlider.background": "#44403C40",
    "scrollbarSlider.hoverBackground": "#44403C80",
    "scrollbarSlider.activeBackground": "#44403CA0",

    // Widget (autocomplete, hover)
    "editorWidget.background": "#1C1917",
    "editorWidget.border": "#292524",
    "editorSuggestWidget.background": "#1C1917",
    "editorSuggestWidget.border": "#292524",
    "editorSuggestWidget.selectedBackground": "#292524",
    "editorSuggestWidget.highlightForeground": "#F59E0B",

    // Peek view
    "peekView.border": "#F59E0B40",
    "peekViewEditor.background": "#0C0A09",
    "peekViewResult.background": "#1C1917",
  },
};
