"use client";

import { useProjectStore } from "@/stores/project-store";
import { EditorTabs } from "./EditorTabs";
import { CodeEditor } from "./CodeEditor";
import { ChevronRight } from "lucide-react";

export function EditorPanel() {
  const activeTabPath = useProjectStore((s) => s.activeTabPath);

  // Breadcrumb from path
  const breadcrumbs = activeTabPath ? activeTabPath.split("/") : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <EditorTabs />
      {/* Breadcrumb */}
      {activeTabPath && (
        <div
          className="flex items-center gap-1 px-4 py-1 flex-shrink-0"
          style={{
            background: "var(--color-bg-root)",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="w-3 h-3"
                  style={{ color: "var(--color-text-muted)", opacity: 0.4 }}
                />
              )}
              <span
                className="text-[11px]"
                style={{
                  color:
                    i === breadcrumbs.length - 1
                      ? "var(--color-text-secondary)"
                      : "var(--color-text-muted)",
                }}
              >
                {part}
              </span>
            </span>
          ))}
        </div>
      )}
      <CodeEditor />
    </div>
  );
}
