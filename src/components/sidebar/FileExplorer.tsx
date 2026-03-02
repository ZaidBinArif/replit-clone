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
      <div
        className={`w-full flex items-center gap-1 py-1 cursor-pointer select-none transition-none ${
          isActive
            ? "bg-[#37373d] text-white"
            : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
        }`}
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          paddingRight: "8px",
        }}
        onClick={() => {
          if (node.type === "directory") {
            setIsOpen(!isOpen);
          } else {
            openFile(node.path);
          }
        }}
      >
        <div className="flex items-center justify-center w-[18px] opacity-80">
          {node.type === "directory" ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span />
          )}
        </div>
        
        {node.type === "directory" ? (
          isOpen ? (
            <FolderOpen className="w-[15px] h-[15px] flex-shrink-0 text-blue-400 opacity-90" strokeWidth={1.5} />
          ) : (
            <Folder className="w-[15px] h-[15px] flex-shrink-0 text-zinc-400 opacity-90" strokeWidth={1.5} />
          )
        ) : (
          <File
            className="w-[15px] h-[15px] flex-shrink-0 opacity-90"
            strokeWidth={1.5}
            style={{ color: iconColor }}
          />
        )}
        <span className="text-[13px] ml-1 tracking-tight truncate pb-[1px]">{node.name}</span>
      </div>

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

  if (!activeProject) return null;

  const tree = buildFileTree(activeProject.files);

  return (
    <div className="flex flex-col h-full text-[#cccccc]">
      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500">
            <p className="text-[13px]">AI is setting up your project...</p>
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
