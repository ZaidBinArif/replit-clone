"use client";

import { useProjectStore } from "@/stores/project-store";
import { ProjectList } from "./ProjectList";
import { FileExplorer } from "./FileExplorer";
import { signOut } from "@/lib/firebase";
import { Code2, LogOut } from "lucide-react";

export function Sidebar() {
  const user = useProjectStore((s) => s.user);
  const sidebarSection = useProjectStore((s) => s.sidebarSection);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setUser = useProjectStore((s) => s.setUser);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--color-bg-surface)",
        borderRight: "1px solid var(--color-border-default)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{
            background: "var(--color-accent-subtle)",
          }}
        >
          <Code2 className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
        </div>
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          CodeStudio
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

      {/* User footer */}
      {user && (
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border-default)" }}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-7 h-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              {user.displayName?.charAt(0) || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {user.displayName}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md transition-colors duration-150 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-bg-elevated)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
