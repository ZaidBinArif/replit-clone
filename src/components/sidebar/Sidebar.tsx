"use client";

import { useProjectStore } from "@/stores/project-store";
import { ProjectList } from "./ProjectList";
import { FileExplorer } from "./FileExplorer";

export function Sidebar() {
  const sidebarSection = useProjectStore((s) => s.sidebarSection);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  return (
    <div className="flex h-full bg-[#18181b] border-r border-[#27272a] text-[#a1a1aa] font-sans selection:bg-[#3f3f46]">
      <div className="flex-1 flex flex-col min-w-0 bg-[#18181b]">
        {/* Header Title */}
        <div className="flex items-center px-4 h-[35px] flex-shrink-0">
          <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            {(!activeProjectId || sidebarSection === "projects") ? "Projects" : "Explorer"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeProjectId && sidebarSection === "files" ? (
            <FileExplorer />
          ) : (
            <ProjectList />
          )}
        </div>
      </div>
    </div>
  );
}
