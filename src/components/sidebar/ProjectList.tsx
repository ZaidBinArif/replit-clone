"use client";

import { useProjectStore } from "@/stores/project-store";
import { formatTime, truncate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { Framework } from "@/types";
import { NewProjectDialog } from "./NewProjectDialog";

const frameworkIcons: Record<Framework, string> = {
  react: "⚛️",
  nextjs: "▲",
  vue: "💚",
  angular: "🅰️",
};

export function ProjectList() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const showNewProject = useProjectStore((s) => s.showNewProject);
  const setShowNewProject = useProjectStore((s) => s.setShowNewProject);

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-[#cccccc]">
      <div className="px-4 py-2 flex items-center justify-between group">
        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">Recent Projects</span>
        <button
          onClick={() => setShowNewProject(true)}
          className="opacity-0 group-hover:opacity-100 hover:bg-zinc-800 p-0.5 rounded transition-all cursor-pointer"
          title="New Project"
        >
          <Plus className="w-[14px] h-[14px] text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="px-4 py-4 text-center">
            <p className="text-[13px] text-zinc-500 mb-3">No projects found.</p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[13px] rounded-sm transition-colors cursor-pointer"
            >
              Start Building
            </button>
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <div
                key={project.id}
                className="group relative"
              >
                <div
                  onClick={() => setActiveProject(project.id)}
                  className={`flex items-start gap-2 py-1.5 px-4 cursor-pointer select-none transition-none ${
                    isActive
                      ? "bg-[#37373d] text-white"
                      : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
                  }`}
                >
                  <span className="text-sm mt-[2px] opacity-90 drop-shadow-sm flex-shrink-0">
                    {frameworkIcons[project.framework]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] tracking-tight truncate pb-[1px] ${isActive ? "text-white" : "text-[#cccccc]"}`}>
                      {truncate(project.title, 35)}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {formatTime(project.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Delete button (visible on group hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-white transition-none cursor-pointer"
                  title="Delete project"
                >
                  <Trash2 className="w-[14px] h-[14px]" strokeWidth={2} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {showNewProject && (
        <NewProjectDialog onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}
