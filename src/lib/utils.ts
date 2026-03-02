// Lightweight className merge (no external dependency)
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

// Generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Get file language from extension
export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    py: "python",
    vue: "vue",
    svg: "xml",
    yaml: "yaml",
    yml: "yaml",
    env: "plaintext",
    gitignore: "plaintext",
  };
  return languageMap[ext || ""] || "plaintext";
}

// Get file icon color based on extension
export function getFileIconColor(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const colorMap: Record<string, string> = {
    ts: "#3178C6",
    tsx: "#3178C6",
    js: "#F7DF1E",
    jsx: "#F7DF1E",
    html: "#E34F26",
    css: "#1572B6",
    scss: "#CC6699",
    json: "#A8A29E",
    md: "#A8A29E",
    vue: "#4FC08D",
    py: "#3776AB",
    svg: "#FFB13B",
  };
  return colorMap[ext || ""] || "#A8A29E";
}

// Get file name from path
export function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

// Get directory from path
export function getDirectory(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

// Format timestamp
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

// Truncate string
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

// Build file tree structure from flat file paths
export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export function buildFileTree(files: Record<string, unknown>): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  
  const sortedPaths = Object.keys(files).sort();
  
  for (const filePath of sortedPaths) {
    const parts = filePath.split("/");
    let current = root;
    let currentPath = "";
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;
      
      let node = current.find((n) => n.name === part);
      
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
        };
        current.push(node);
      }
      
      if (!isFile && node.children) {
        current = node.children;
      }
    }
  }
  
  // Sort: directories first, then files, alphabetically
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };
  
  return sortNodes(root);
}
