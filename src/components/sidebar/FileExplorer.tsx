"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { buildFileTree, getFileIconColor, type FileTreeNode } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  ArrowLeft,
  Plus,
  FilePlus,
} from "lucide-react";

function FileTreeItem({
  node,
  depth = 0,
}: {
  node: FileTreeNode;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const activeTabPath = useProjectStore((s) => s.activeTabPath);
  const openFile = useProjectStore((s) => s.openFile);
  const isActive = node.type === "file" && activeTabPath === node.path;
  const iconColor = node.type === "file" ? getFileIconColor(node.path) : undefined;

  return (
    <div>
      <button
        className="w-full flex items-center gap-1.5 py-1 text-left transition-all duration-100 cursor-pointer"
        style={{
          paddingLeft: `${depth * 16 + 12}px`,
          paddingRight: "12px",
          background: isActive ? "var(--color-bg-elevated)" : "transparent",
          color: isActive
            ? "var(--color-text-primary)"
            : "var(--color-text-secondary)",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "var(--color-bg-surface)";
            e.currentTarget.style.color = "var(--color-text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }
        }}
        onClick={() => {
          if (node.type === "directory") {
            setIsOpen(!isOpen);
          } else {
            openFile(node.path);
          }
        }}
      >
        {node.type === "directory" ? (
          <>
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
            )}
            {isOpen ? (
              <FolderOpen
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--color-accent)" }}
              />
            ) : (
              <Folder
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--color-text-muted)" }}
              />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <File
              className="w-4 h-4 flex-shrink-0"
              style={{ color: iconColor }}
            />
          </>
        )}
        <span className="text-[13px] truncate">{node.name}</span>
      </button>

      {node.type === "directory" && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const setSidebarSection = useProjectStore((s) => s.setSidebarSection);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  if (!activeProject) return null;

  const tree = buildFileTree(activeProject.files);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <button
          onClick={() => {
            setActiveProject(null);
            setSidebarSection("projects");
          }}
          className="p-1 rounded-md transition-colors duration-150 cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-elevated)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
          title="Back to projects"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span
          className="text-xs font-semibold uppercase tracking-wider flex-1 truncate"
          style={{ color: "var(--color-text-muted)" }}
        >
          {activeProject.title}
        </span>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FilePlus
              className="w-8 h-8 mx-auto mb-3 opacity-20"
              style={{ color: "var(--color-text-muted)" }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              AI is setting up your project...
            </p>
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeItem key={node.path} node={node} />
          ))
        )}
      </div>
    </div>
  );
}
