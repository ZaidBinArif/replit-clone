"use client";

import { useCallback, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useProjectStore } from "@/stores/project-store";
import { getLanguageFromPath } from "@/lib/utils";
import { codeStudioTheme } from "@/lib/monaco-theme";
import { updateFileInContainer } from "@/lib/webcontainer";
import type { editor } from "monaco-editor";

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

    if (!themeRegistered) {
      monaco.editor.defineTheme("codestudio-dark", codeStudioTheme);
      themeRegistered = true;
    }
    monaco.editor.setTheme("codestudio-dark");

    // Ctrl+S / Cmd+S: save file, clear dirty flag, sync to WebContainer immediately
    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        const store = useProjectStore.getState();
        const project = store.getActiveProject();
        const tabPath = store.activeTabPath;
        if (!project || !tabPath) return;

        const value = editorInstance.getValue();
        store.updateFile(project.id, tabPath, value);
        store.markTabDirty(tabPath, false);
        updateFileInContainer(tabPath, value).catch(console.error);
      }
    );
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
      <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
        <div className="text-center opacity-40 select-none">
          <svg className="w-24 h-24 mx-auto mb-6 opacity-30 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="m10 13-2 2 2 2"></path>
            <path d="m14 17 2-2-2-2"></path>
          </svg>
          <div className="text-[14px] text-white tracking-wide">
            Select a file to start editing
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        language={getLanguageFromPath(activeTabPath || "")}
        value={file.content}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        loading={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="w-5 h-5 border-[2px] border-[#333333] border-t-[#007acc] rounded-full animate-spin" />
          </div>
        }
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontLigatures: true,
          lineHeight: 22,
          padding: { top: 16 },
          minimap: { enabled: true, scale: 0.75, showSlider: "mouseover" },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          cursorBlinking: "smooth",
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </div>
  );
}
