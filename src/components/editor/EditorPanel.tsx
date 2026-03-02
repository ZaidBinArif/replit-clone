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
    <div className="flex flex-col h-full overflow-hidden bg-[#1e1e1e]">
      <EditorTabs />
      {/* Breadcrumb */}
      {activeTabPath && (
        <div className="flex items-center gap-1 px-4 h-[26px] flex-shrink-0 bg-[#1e1e1e] border-b border-[#2b2b2b] text-[#cccccc]">
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1 group cursor-pointer">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 opacity-50" strokeWidth={1.5} />
              )}
              <span
                className={`text-[12px] tracking-tight hover:text-white transition-none pb-[1px] ${
                  i === breadcrumbs.length - 1
                    ? "text-[#cccccc]"
                    : "opacity-70"
                }`}
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
