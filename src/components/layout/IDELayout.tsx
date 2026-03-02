"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { useAutoChat } from "@/hooks/useAutoChat";
import { useSummarization } from "@/hooks/useSummarization";
import { useFirestoreSync } from "@/hooks/useFirestoreSync";
import { Eye, EyeOff } from "lucide-react";

export function IDELayout() {
  const panelSizes = useProjectStore((s) => s.panelSizes);
  const setPanelSize = useProjectStore((s) => s.setPanelSize);
  const showPreview = useProjectStore((s) => s.showPreview);
  const togglePreview = useProjectStore((s) => s.togglePreview);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  // Auto-trigger AI for newly created projects
  useAutoChat();
  // Run async summarization after AI responses
  useSummarization();
  // Sync projects with Firestore (load on login, auto-save on changes)
  useFirestoreSync();

  const [isDragging, setIsDragging] = useState<"sidebar" | "editor-chat" | "preview" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (handle: "sidebar" | "editor-chat" | "preview") => {
      setIsDragging(handle);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDragging === "sidebar") {
        const newWidth = Math.max(200, Math.min(400, e.clientX - rect.left));
        setPanelSize("sidebar", newWidth);
      } else if (isDragging === "editor-chat") {
        const mainAreaStart = panelSizes.sidebar;
        const mainAreaWidth = rect.width - mainAreaStart;
        const relativeX = e.clientX - rect.left - mainAreaStart;
        const percentage = Math.max(25, Math.min(75, (relativeX / mainAreaWidth) * 100));
        setPanelSize("editor", percentage);
      } else if (isDragging === "preview") {
        const mainAreaHeight = rect.height;
        const relativeY = e.clientY - rect.top;
        const percentage = Math.max(20, Math.min(80, (relativeY / mainAreaHeight) * 100));
        setPanelSize("previewHeight", 100 - percentage);
      }
    },
    [isDragging, panelSizes.sidebar, setPanelSize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        isDragging === "preview" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className="flex-shrink-0 h-full"
        style={{ width: `${panelSizes.sidebar}px` }}
      >
        <Sidebar />
      </div>

      {/* Sidebar resize handle */}
      <div
        className="resize-handle resize-handle-h"
        onMouseDown={() => handleMouseDown("sidebar")}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top: Editor + Chat */}
        <div
          className="flex overflow-hidden"
          style={{
            height: showPreview && activeProjectId
              ? `${100 - panelSizes.previewHeight}%`
              : "100%",
          }}
        >
          {/* Editor */}
          {activeProjectId && (
            <>
              <div
                className="h-full overflow-hidden"
                style={{ width: `${panelSizes.editor}%` }}
              >
                <EditorPanel />
              </div>

              {/* Editor-Chat resize handle */}
              <div
                className="resize-handle resize-handle-h"
                onMouseDown={() => handleMouseDown("editor-chat")}
              />
            </>
          )}

          {/* Chat */}
          <div
            className="h-full overflow-hidden"
            style={{
              width: activeProjectId
                ? `${100 - panelSizes.editor}%`
                : "100%",
            }}
          >
            <ChatPanel />
          </div>
        </div>

        {/* Preview resize handle */}
        {showPreview && activeProjectId && (
          <div
            className="resize-handle resize-handle-v"
            onMouseDown={() => handleMouseDown("preview")}
          />
        )}

        {/* Preview */}
        {showPreview && activeProjectId && (
          <div
            className="overflow-hidden"
            style={{ height: `${panelSizes.previewHeight}%` }}
          >
            <PreviewPanel />
          </div>
        )}
      </div>

      {/* Floating preview toggle */}
      {activeProjectId && (
        <button
          onClick={togglePreview}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-secondary)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent-muted)";
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border-default)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          {showPreview ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              Show Preview
            </>
          )}
        </button>
      )}
    </div>
  );
}
