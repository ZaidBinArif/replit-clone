"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { NewProjectDialog } from "@/components/sidebar/NewProjectDialog";
import { signOut } from "@/lib/firebase";
import { formatTime } from "@/lib/utils";
import {
  Code2,
  Plus,
  Search,
  Clock,
  FolderOpen,
  Settings,
  LogOut,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type { Project } from "@/types";

function ProjectCard({
  project,
  onSelect,
  onDelete,
}: {
  project: Project;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-[#12121a] overflow-hidden cursor-pointer hover:border-indigo-500/30 transition-colors"
    >
      {/* Content */}
      <div className="flex flex-col gap-3 p-5 pt-6">
        <div className="flex items-start gap-3">
          <FolderOpen className="w-5 h-5 text-zinc-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white truncate">
              {project.title}
            </h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 line-clamp-2">
              A {project.framework} application
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(project.updatedAt)}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        </div>
      </div>

      {/* Delete button on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        title="Delete project"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function UserMenu({
  user,
  onLogout,
}: {
  user: { displayName: string; email: string; photoURL: string };
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-8 h-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold text-white">
            {user.displayName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <div className="hidden sm:block text-left">
          <p className="text-[13px] font-medium text-white leading-tight">
            {user.displayName || "User"}
          </p>
          <p className="text-[11px] text-zinc-500 leading-tight">
            {user.email}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.06] bg-[#16161e] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[13px] font-medium text-white">
              {user.displayName || "User"}
            </p>
            <p className="text-[12px] text-zinc-500">{user.email}</p>
          </div>
          <div className="py-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-zinc-300 hover:bg-white/[0.04] transition-colors cursor-pointer">
              <Settings className="w-4 h-4 text-zinc-500" />
              Settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const user = useProjectStore((s) => s.user);
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const setUser = useProjectStore((s) => s.setUser);

  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a10] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-10 h-16 flex-shrink-0 border-b border-white/[0.04] bg-[#0c0c14]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Code2 className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            CodeStudio
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>

          {user && (
            <UserMenu
              user={user}
              onLogout={handleLogout}
            />
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Projects
            </h1>
            <p className="text-[15px] text-zinc-500 mt-1">
              Access and manage all your coding projects
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#12121a] border border-white/[0.06] text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          {/* Grid */}
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderOpen className="w-12 h-12 text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-1">
                {search ? "No matching projects" : "No projects yet"}
              </h3>
              <p className="text-[14px] text-zinc-600 mb-6">
                {search
                  ? "Try a different search term."
                  : "Create your first project to get started."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowNewProject(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[14px] font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={() => setActiveProject(project.id)}
                  onDelete={() => deleteProject(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Project Dialog */}
      {showNewProject && (
        <NewProjectDialog onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}
