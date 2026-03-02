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
    <div className="flex items-center overflow-x-auto flex-shrink-0 bg-[#18181b] border-b border-[#2b2b2b] h-[35px] hide-scrollbar scroll-smooth text-[#cccccc]">
      {openTabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const fileName = getFileName(tab.path);
        const iconColor = getFileIconColor(tab.path);

        return (
          <div
            key={tab.path}
            className={`group flex items-center gap-1.5 px-3 h-full cursor-pointer select-none relative flex-shrink-0 transition-none border-r border-[#2b2b2b] ${
              isActive
                ? "bg-[#1e1e1e] text-white"
                : "bg-[#2d2d2d] text-[#969696] hover:bg-[#2b2b2b] hover:text-white"
            }`}
            onClick={() => setActiveTab(tab.path)}
          >
            {/* Active indicator (top line) */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#007acc]" />
            )}

            <File
              className={`w-[14px] h-[14px] flex-shrink-0 transition-none ${isActive ? "opacity-100" : "opacity-80"}`}
              style={{ color: iconColor }}
              strokeWidth={1.5}
            />
            <span className="text-[13px] font-sans tracking-tight whitespace-nowrap">{fileName}</span>

            {/* Dirty indicator / Close Button */}
            <div className="flex items-center justify-center w-5 h-5 ml-1">
              {tab.isDirty ? (
                <div className="w-[8px] h-[8px] rounded-full bg-white opacity-40 group-hover:hidden" />
              ) : null}
              <button
                className={`p-0.5 rounded-[3px] hover:bg-[#333333] transition-none cursor-pointer text-zinc-400 hover:text-white ${
                  tab.isDirty ? "hidden group-hover:block" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
