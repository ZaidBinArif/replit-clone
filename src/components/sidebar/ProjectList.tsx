"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { formatTime, truncate } from "@/lib/utils";
import {
  Plus,
  MessageSquare,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
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
  const [showNewProject, setShowNewProject] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Projects
        </span>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 cursor-pointer"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-elevated)";
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          title="New project"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-1">
        {projects.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare
              className="w-8 h-8 mx-auto mb-3 opacity-20"
              style={{ color: "var(--color-text-muted)" }}
            />
            <p
              className="text-sm mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              No projects yet
            </p>
            <p
              className="text-xs mb-4"
              style={{ color: "var(--color-text-muted)", opacity: 0.6 }}
            >
              Start building something amazing
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-accent-glow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-accent-subtle)";
              }}
            >
              <Plus className="w-3 h-3" />
              New Project
            </button>
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isHovered = hoveredId === project.id;
            return (
              <div
                key={project.id}
                className="relative group px-2 py-0.5"
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => setActiveProject(project.id)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer"
                  style={{
                    background: isActive
                      ? "var(--color-bg-elevated)"
                      : "transparent",
                    borderLeft: isActive
                      ? "2px solid var(--color-accent)"
                      : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--color-bg-surface)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">
                    {frameworkIcons[project.framework]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: isActive
                          ? "var(--color-text-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {truncate(project.title, 28)}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {project.messages.length} messages · {formatTime(project.updatedAt)}
                    </p>
                  </div>
                </button>

                {/* Delete button on hover */}
                {isHovered && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-150 animate-fade-in cursor-pointer"
                    style={{
                      color: "var(--color-text-muted)",
                      background: "var(--color-bg-elevated)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--color-error)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--color-text-muted)";
                    }}
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New project dialog */}
      {showNewProject && (
        <NewProjectDialog onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}
