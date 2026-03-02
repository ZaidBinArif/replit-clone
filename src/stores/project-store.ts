import { create } from "zustand";
import type {
  Project,
  ProjectFile,
  ChatMessage,
  EditorTab,
  Framework,
  FileOperation,
  PanelSizes,
} from "@/types";
import { generateId, getLanguageFromPath } from "@/lib/utils";

// ============================================
// Store Interface
// ============================================

interface ProjectState {
  // Current user
  user: { uid: string; email: string; displayName: string; photoURL: string } | null;
  setUser: (user: ProjectState["user"]) => void;

  // Projects list
  projects: Project[];
  activeProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | undefined;

  // Create / delete project
  createProject: (title: string, framework: Framework) => Project;
  deleteProject: (id: string) => void;
  updateProjectTitle: (id: string, title: string) => void;

  // File operations
  addFile: (projectId: string, path: string, content: string) => void;
  updateFile: (projectId: string, path: string, content: string) => void;
  deleteFile: (projectId: string, path: string) => void;
  applyFileOperations: (projectId: string, ops: FileOperation[]) => void;

  // Editor tabs
  openTabs: EditorTab[];
  activeTabPath: string | null;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  markTabDirty: (path: string, isDirty: boolean) => void;

  // Chat
  addMessage: (projectId: string, message: Omit<ChatMessage, "id" | "index">) => void;
  updateLastAssistantMessage: (projectId: string, content: string) => void;

  // UI state
  panelSizes: PanelSizes;
  setPanelSize: (key: keyof PanelSizes, value: number) => void;
  showPreview: boolean;
  togglePreview: () => void;
  isChatLoading: boolean;
  setChatLoading: (loading: boolean) => void;
  sidebarSection: "projects" | "files";
  setSidebarSection: (section: "projects" | "files") => void;
}

// ============================================
// Store Implementation
// ============================================

export const useProjectStore = create<ProjectState>((set, get) => ({
  // ---- User ----
  user: null,
  setUser: (user) => set({ user }),

  // ---- Projects ----
  projects: [],
  activeProjectId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    set({
      activeProjectId: id,
      openTabs: [],
      activeTabPath: null,
      sidebarSection: id ? "files" : "projects",
    });
    // Auto-open entry file if exists
    if (project) {
      const entryFiles = [
        "src/App.tsx",
        "src/App.vue",
        "src/app/page.tsx",
        "src/app.component.ts",
        "src/App.jsx",
        "index.html",
      ];
      for (const entry of entryFiles) {
        if (project.files[entry]) {
          get().openFile(entry);
          break;
        }
      }
    }
  },
  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId);
  },

  // ---- Create / Delete Project ----
  createProject: (title, framework) => {
    const project: Project = {
      id: generateId(),
      userId: get().user?.uid || "",
      title,
      framework,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: {},
      messages: [],
      contextState: {
        tierA_summary: "",
        tierA_coversUpTo: -1,
        tierB_startFrom: 0,
      },
    };
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: project.id,
      openTabs: [],
      activeTabPath: null,
      sidebarSection: "files",
    }));
    return project;
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId:
        state.activeProjectId === id ? null : state.activeProjectId,
    }));
  },

  updateProjectTitle: (id, title) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, title, updatedAt: Date.now() } : p
      ),
    }));
  },

  // ---- File Operations ----
  addFile: (projectId, path, content) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: Date.now(),
              files: {
                ...p.files,
                [path]: {
                  path,
                  content,
                  language: getLanguageFromPath(path),
                  lastEdited: Date.now(),
                },
              },
            }
          : p
      ),
    }));
  },

  updateFile: (projectId, path, content) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId && p.files[path]
          ? {
              ...p,
              updatedAt: Date.now(),
              files: {
                ...p.files,
                [path]: { ...p.files[path], content, lastEdited: Date.now() },
              },
            }
          : p
      ),
    }));
  },

  deleteFile: (projectId, path) => {
    set((state) => {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return state;
      const { [path]: _, ...remainingFiles } = project.files;
      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, files: remainingFiles, updatedAt: Date.now() }
            : p
        ),
        openTabs: state.openTabs.filter((t) => t.path !== path),
        activeTabPath:
          state.activeTabPath === path
            ? state.openTabs.find((t) => t.path !== path)?.path || null
            : state.activeTabPath,
      };
    });
  },

  applyFileOperations: (projectId, ops) => {
    for (const op of ops) {
      switch (op.type) {
        case "create":
          get().addFile(projectId, op.filePath, op.content || "");
          get().openFile(op.filePath);
          break;
        case "edit":
          get().updateFile(projectId, op.filePath, op.content || "");
          break;
        case "delete":
          get().deleteFile(projectId, op.filePath);
          break;
      }
    }
  },

  // ---- Editor Tabs ----
  openTabs: [],
  activeTabPath: null,

  openFile: (path) => {
    set((state) => {
      const exists = state.openTabs.find((t) => t.path === path);
      if (exists) {
        return { activeTabPath: path };
      }
      return {
        openTabs: [...state.openTabs, { path, isDirty: false }],
        activeTabPath: path,
      };
    });
  },

  closeTab: (path) => {
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.path !== path);
      let newActive = state.activeTabPath;
      if (state.activeTabPath === path) {
        const idx = state.openTabs.findIndex((t) => t.path === path);
        newActive =
          newTabs[Math.min(idx, newTabs.length - 1)]?.path || null;
      }
      return { openTabs: newTabs, activeTabPath: newActive };
    });
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  markTabDirty: (path, isDirty) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.path === path ? { ...t, isDirty } : t
      ),
    }));
  },

  // ---- Chat ----
  addMessage: (projectId, message) => {
    set((state) => {
      const project = state.projects.find((p) => p.id === projectId);
      const index = project ? project.messages.length : 0;
      const fullMessage: ChatMessage = {
        ...message,
        id: generateId(),
        index,
      };
      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                messages: [...p.messages, fullMessage],
                updatedAt: Date.now(),
              }
            : p
        ),
      };
    });
  },

  updateLastAssistantMessage: (projectId, content) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const messages = [...p.messages];
        const lastIdx = messages.length - 1;
        if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
          messages[lastIdx] = { ...messages[lastIdx], content };
        }
        return { ...p, messages, updatedAt: Date.now() };
      }),
    }));
  },

  // ---- UI State ----
  panelSizes: {
    sidebar: 260,
    editor: 50, // percentage
    chat: 50, // percentage
    previewHeight: 40, // percentage
  },
  setPanelSize: (key, value) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, [key]: value },
    })),
  showPreview: true,
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
  isChatLoading: false,
  setChatLoading: (loading) => set({ isChatLoading: loading }),
  sidebarSection: "projects" as const,
  setSidebarSection: (section) => set({ sidebarSection: section }),
}));
