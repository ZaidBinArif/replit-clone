"use client";

import { useCallback, useRef } from "react";
import Editor, { type OnMount, loader } from "@monaco-editor/react";
import { useProjectStore } from "@/stores/project-store";
import { getLanguageFromPath } from "@/lib/utils";
import { codeStudioTheme } from "@/lib/monaco-theme";
import type { editor } from "monaco-editor";

// Register custom theme before mount
let themeRegistered = false;

export function CodeEditor() {
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const activeTabPath = useProjectStore((s) => s.activeTabPath);
  const updateFile = useProjectStore((s) => s.updateFile);
  const markTabDirty = useProjectStore((s) => s.markTabDirty);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const file =
    activeProject && activeTabPath
      ? activeProject.files[activeTabPath]
      : null;

  const handleEditorMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;

    // Register custom theme
    if (!themeRegistered) {
      monaco.editor.defineTheme("codestudio-dark", codeStudioTheme);
      themeRegistered = true;
    }
    monaco.editor.setTheme("codestudio-dark");
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeProject || !activeTabPath || value === undefined) return;
      updateFile(activeProject.id, activeTabPath, value);
      markTabDirty(activeTabPath, true);
    },
    [activeProject, activeTabPath, updateFile, markTabDirty]
  );

  if (!file) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--color-bg-root)" }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-[0.06]">{"</>"}</div>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Select a file to start editing
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
          >
            Or let AI generate code for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden" style={{ background: "#0C0A09" }}>
      <Editor
        height="100%"
        language={getLanguageFromPath(activeTabPath || "")}
        value={file.content}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        loading={
          <div
            className="flex items-center justify-center h-full"
            style={{ background: "#0C0A09" }}
          >
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--color-border-default)",
                borderTopColor: "var(--color-accent)",
              }}
            />
          </div>
        }
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineHeight: 20,
          padding: { top: 12 },
          minimap: { enabled: true, scale: 1, showSlider: "mouseover" },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          cursorBlinking: "smooth",
          renderLineHighlight: "gutter",
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}
