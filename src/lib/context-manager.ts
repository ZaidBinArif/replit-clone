import type { Project, ChatMessage, Framework } from "@/types";
import { retrieveSkills } from "@/lib/skills";

// ============================================
// Context Manager — 4-Layer Assembly
// ============================================

const TIER_C_SIZE = 10; // Last N messages kept in full
const TIER_B_SIZE = 20; // Next N messages compressed
const TOKEN_ESTIMATE_PER_CHAR = 0.25; // Rough estimate: 1 token ≈ 4 chars

// ============================================
// System Prompts per Framework
// ============================================

const frameworkInstructions: Record<Framework, string> = {
  react: `You are building a React application using Vite + React + Tailwind CSS.
Use functional components with hooks. Use TypeScript (.tsx files).
Entry point: src/main.tsx renders src/App.tsx.`,

  nextjs: `You are building a Next.js application with App Router + Tailwind CSS.
Use the app/ directory with page.tsx, layout.tsx conventions. Use TypeScript.
Use server/client components appropriately with "use client" directive.`,

  vue: `You are building a Vue 3 application using Vite + Vue + Tailwind CSS.
Use Composition API with <script setup> syntax. Use TypeScript.
Entry point: src/main.ts mounts src/App.vue.`,

  angular: `You are building an Angular 17+ application with Tailwind CSS.
Use standalone components. Use TypeScript.
Entry point: src/main.ts bootstraps src/app/app.component.ts.`,
};

// ============================================
// Build System Prompt
// ============================================

function buildSystemPrompt(framework: Framework): string {
  return `You are CodeStudio AI, an expert full-stack developer. You help users build web applications.

${frameworkInstructions[framework]}

RESPONSE FORMAT:
- Wrap ALL file creations/edits in a boltArtifact block
- Use boltAction with type="file" and filePath for each file
- Write explanatory text OUTSIDE the artifact block
- ALWAYS create complete, working files — never partial code
- Use modern best practices, clean code, proper TypeScript types
- Use Tailwind CSS for styling — make the UI beautiful and polished

CRITICAL FILE RULES:
- ALWAYS include package.json as a boltAction type="file" with ALL dependencies listed
- ALWAYS include ALL config files as type="file": vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, index.html
- NEVER use boltAction type="shell" for project scaffolding (no npm create, no npx commands)
- NEVER use boltAction type="shell" to install packages — put ALL dependencies in package.json instead
- File paths must be relative to the project root (e.g. "src/App.tsx", NOT "my-app/src/App.tsx")
- Do NOT prefix file paths with a project subdirectory name

EXAMPLE RESPONSE:
I'll create a todo app with a clean interface.

<boltArtifact id="project" title="Todo App">
<boltAction type="file" filePath="package.json">
{
  "name": "my-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0", "lucide-react": "^0.300.0" },
  "devDependencies": { "@vitejs/plugin-react": "^4.2.0", "vite": "^5.0.0", "tailwindcss": "^3.4.1", "postcss": "^8.4.33", "autoprefixer": "^10.4.17", "typescript": "^5.3.0", "@types/react": "^18.2.0", "@types/react-dom": "^18.2.0" }
}
</boltAction>
<boltAction type="file" filePath="src/App.tsx">
import React from 'react';
// ... full file content
</boltAction>
</boltArtifact>

IMPORTANT RULES:
1. Always write COMPLETE files, never snippets or partial code
2. Include proper imports in every file
3. Make the UI visually polished with Tailwind
4. Handle edge cases and loading states
5. When editing existing files, rewrite the ENTIRE file with changes applied
6. package.json MUST always be included as the FIRST file in any new project
7. For Tailwind CSS, include postcss.config.js with: export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`;
}

// ============================================
// Build File Tree String
// ============================================

function buildFileTree(files: Record<string, { path: string }>): string {
  const paths = Object.keys(files).sort();
  if (paths.length === 0) return "No files yet.";

  return paths.map((p) => `  ${p}`).join("\n");
}

// ============================================
// Smart File Selection (Priority Queue)
// ============================================

function selectFileContents(
  project: Project,
  activeFilePath: string | null,
  recentlyModifiedFiles: string[],
  maxTokenBudget: number
): string {
  const parts: string[] = [];
  let estimatedTokens = 0;

  const addFile = (path: string, label?: string) => {
    const file = project.files[path];
    if (!file) return;
    const content = `=== FILE: ${path}${label ? ` (${label})` : ""} ===\n${file.content}\n=== END FILE ===`;
    const tokens = content.length * TOKEN_ESTIMATE_PER_CHAR;
    if (estimatedTokens + tokens < maxTokenBudget) {
      parts.push(content);
      estimatedTokens += tokens;
    }
  };

  // Priority 1: Active file
  if (activeFilePath) {
    addFile(activeFilePath, "currently open");
  }

  // Priority 2: Recently modified by AI
  for (const path of recentlyModifiedFiles) {
    if (path !== activeFilePath) {
      addFile(path, "recently edited");
    }
  }

  // Priority 3: Entry point files
  const entryFiles = [
    "src/App.tsx", "src/App.vue", "src/app/page.tsx",
    "src/app.component.ts", "src/main.tsx", "src/main.ts",
    "package.json",
  ];
  for (const path of entryFiles) {
    if (path !== activeFilePath && !recentlyModifiedFiles.includes(path)) {
      addFile(path);
    }
  }

  // Priority 4: Remaining files (summary only if over budget)
  for (const path of Object.keys(project.files)) {
    if (
      path !== activeFilePath &&
      !recentlyModifiedFiles.includes(path) &&
      !entryFiles.includes(path)
    ) {
      const file = project.files[path];
      if (file.summary) {
        const summary = `=== FILE: ${path} (summary) ===\n${file.summary}\n=== END FILE ===`;
        const tokens = summary.length * TOKEN_ESTIMATE_PER_CHAR;
        if (estimatedTokens + tokens < maxTokenBudget) {
          parts.push(summary);
          estimatedTokens += tokens;
        }
      } else {
        addFile(path);
      }
    }
  }

  return parts.join("\n\n");
}

// ============================================
// Chat History Assembly (3-Tier)
// ============================================

function assembleChatHistory(
  messages: ChatMessage[],
  contextState: Project["contextState"]
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  const assembled: Array<{ role: "user" | "assistant"; content: string }> = [];
  const total = messages.length;

  // Tier A: Rolling summary (if exists)
  if (contextState.tierA_summary) {
    assembled.push({
      role: "assistant" as const,
      content: `[CONVERSATION SUMMARY]: ${contextState.tierA_summary}`,
    });
  }

  // Tier B: Compressed messages
  const tierBStart = contextState.tierB_startFrom;
  const tierCStart = Math.max(0, total - TIER_C_SIZE);

  for (let i = tierBStart; i < tierCStart && i < total; i++) {
    const msg = messages[i];
    if (msg.compressed) {
      assembled.push({
        role: msg.role,
        content: `[Compressed]: ${msg.compressed}`,
      });
    } else {
      // If not yet compressed, include a truncated version
      const truncated =
        msg.content.length > 200
          ? msg.content.substring(0, 200) + "... [truncated]"
          : msg.content;
      assembled.push({
        role: msg.role,
        content: truncated,
      });
    }
  }

  // Tier C: Recent full messages
  for (let i = tierCStart; i < total; i++) {
    if (i >= 0 && messages[i]) {
      assembled.push({
        role: messages[i].role,
        content: messages[i].content,
      });
    }
  }

  return assembled;
}

// ============================================
// Main: Build Full Context
// ============================================

export interface ContextBuilderOptions {
  project: Project;
  activeFilePath: string | null;
  newUserMessage: string;
}

export function buildContext(options: ContextBuilderOptions): Array<{
  role: "user" | "assistant" | "system";
  content: string;
}> {
  const { project, activeFilePath, newUserMessage } = options;

  // 1. System prompt
  const systemPrompt = buildSystemPrompt(project.framework);

  // 2. File tree
  const fileTree = buildFileTree(project.files);

  // 3. Get recently modified files from last 5 assistant messages
  const recentlyModified = new Set<string>();
  const recentMessages = project.messages.slice(-10);
  for (const msg of recentMessages) {
    if (msg.filesModified) {
      for (const f of msg.filesModified) {
        recentlyModified.add(f);
      }
    }
  }

  // 4. File contents with smart selection
  const fileContents = selectFileContents(
    project,
    activeFilePath,
    Array.from(recentlyModified),
    30000 // ~30K token budget for files
  );

  // 5. Assemble chat history
  const chatHistory = assembleChatHistory(
    project.messages,
    project.contextState
  );

  // 6. RAG - retrieve relevant skills
  const relevantSkills = retrieveSkills(newUserMessage, project.framework, 3);
  const skillsContext = relevantSkills.length > 0
    ? `\n\nRELEVANT DOCUMENTATION:\n${relevantSkills.map(s => `--- ${s.title} ---\n${s.content}`).join("\n\n")}`
    : "";

  // Build final messages array
  const messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }> = [];

  // System message with everything
  messages.push({
    role: "system",
    content: `${systemPrompt}

PROJECT STRUCTURE:
${fileTree}

CURRENT FILES:
${fileContents}${skillsContext}`,
  });

  // Chat history
  for (const msg of chatHistory) {
    messages.push(msg);
  }

  // New user message
  messages.push({
    role: "user",
    content: newUserMessage,
  });

  return messages;
}

// ============================================
// Compress a message (for Tier C → Tier B)
// ============================================

export function createCompressedMessage(message: ChatMessage): string {
  const isUser = message.role === "user";
  const prefix = isUser ? "User asked" : "AI responded";

  // For user messages, keep the intent
  if (isUser) {
    return message.content.length > 150
      ? `${prefix}: ${message.content.substring(0, 150)}...`
      : `${prefix}: ${message.content}`;
  }

  // For assistant messages, extract what was done
  const fileOps: string[] = [];
  const fileRegex = /filePath="([^"]+)"/g;
  let match;
  while ((match = fileRegex.exec(message.content)) !== null) {
    fileOps.push(match[1]);
  }

  // Get text outside artifacts
  let cleanText = message.content
    .replace(/<boltArtifact[\s\S]*?<\/boltArtifact>/g, "")
    .trim();
  cleanText =
    cleanText.length > 100
      ? cleanText.substring(0, 100) + "..."
      : cleanText;

  if (fileOps.length > 0) {
    return `${prefix}: ${cleanText} [Modified files: ${fileOps.join(", ")}]`;
  }

  return `${prefix}: ${cleanText}`;
}
