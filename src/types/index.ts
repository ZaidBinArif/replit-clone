// ============================================
// Core Types
// ============================================

export type Framework = "react" | "nextjs" | "vue" | "angular";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  summary?: string;
  summaryUpdatedAt?: number;
  lastEdited: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  compressed?: string;
  filesModified?: string[];
  timestamp: number;
  index: number;
}

export interface ContextState {
  tierA_summary: string;
  tierA_coversUpTo: number;
  tierB_startFrom: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  framework: Framework;
  createdAt: number;
  updatedAt: number;
  files: Record<string, ProjectFile>;
  messages: ChatMessage[];
  contextState: ContextState;
  netlifyId?: string;
  lastDeployUrl?: string;
}

// ============================================
// AI Types
// ============================================

export interface FileOperation {
  type: "create" | "edit" | "delete";
  filePath: string;
  content?: string;
}

export interface ShellOperation {
  command: string;
}

export interface AIResponse {
  message: string;
  fileOperations: FileOperation[];
  shellOperations: ShellOperation[];
}

// ============================================
// UI Types
// ============================================

export interface EditorTab {
  path: string;
  isDirty: boolean;
}

export interface PanelSizes {
  sidebar: number;
  editor: number;
  chat: number;
  previewHeight: number;
}

// ============================================
// RAG Types
// ============================================

export interface Skill {
  id: string;
  framework: Framework | "general";
  title: string;
  content: string;
  embedding?: number[];
}
