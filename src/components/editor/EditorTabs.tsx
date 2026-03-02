"use client";

import { useProjectStore } from "@/stores/project-store";
import { getFileName, getFileIconColor } from "@/lib/utils";
import { X, File } from "lucide-react";

export function EditorTabs() {
  const openTabs = useProjectStore((s) => s.openTabs);
  const activeTabPath = useProjectStore((s) => s.activeTabPath);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const closeTab = useProjectStore((s) => s.closeTab);

  if (openTabs.length === 0) return null;

  return (
    <div
      className="flex items-center overflow-x-auto flex-shrink-0"
      style={{
        background: "var(--color-bg-surface)",
        borderBottom: "1px solid var(--color-border-default)",
        height: "36px",
      }}
    >
      {openTabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const fileName = getFileName(tab.path);
        const iconColor = getFileIconColor(tab.path);

        return (
          <div
            key={tab.path}
            className="group flex items-center gap-1.5 px-3 h-full cursor-pointer select-none relative flex-shrink-0 transition-colors duration-100"
            style={{
              background: isActive
                ? "var(--color-bg-root)"
                : "transparent",
              color: isActive
                ? "var(--color-text-primary)"
                : "var(--color-text-muted)",
              borderRight: "1px solid var(--color-border-default)",
            }}
            onClick={() => setActiveTab(tab.path)}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--color-text-muted)";
              }
            }}
          >
            {/* Active indicator */}
            {isActive && (
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: "var(--color-accent)" }}
              />
            )}

            <File
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: iconColor }}
            />
            <span className="text-[12px] whitespace-nowrap">{fileName}</span>

            {/* Dirty indicator */}
            {tab.isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "var(--color-accent)" }}
              />
            )}

            {/* Close button */}
            <button
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-bg-elevated)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
