"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { ChatMessage } from "./ChatMessage";
import { Send, Loader2, Sparkles } from "lucide-react";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeProject = useProjectStore((s) => s.getActiveProject());
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const addMessage = useProjectStore((s) => s.addMessage);
  const isChatLoading = useProjectStore((s) => s.isChatLoading);
  const setChatLoading = useProjectStore((s) => s.setChatLoading);

  const messages = activeProject?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeProjectId]);

  const handleSend = async () => {
    if (!input.trim() || !activeProjectId || isChatLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    addMessage(activeProjectId, {
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    // Call AI
    setChatLoading(true);
    try {
      // Get latest project state for context
      const currentProject = useProjectStore.getState().getActiveProject();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          message: userMessage,
          project: currentProject,
        }),
      });

      if (!response.ok) throw new Error("AI request failed");

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      // Add placeholder assistant message
      addMessage(activeProjectId, {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      });

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        // Update the last assistant message with accumulated content
        useProjectStore
          .getState()
          .updateLastAssistantMessage(activeProjectId, fullContent);
      }

      // Parse and apply file operations from the final content
      const fileOps = parseFileOperations(fullContent);
      if (fileOps.length > 0) {
        useProjectStore
          .getState()
          .applyFileOperations(activeProjectId, fileOps);
      }
    } catch (error) {
      console.error("Chat error:", error);
      addMessage(activeProjectId, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // No active project - show welcome
  if (!activeProject) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full px-8"
        style={{ background: "var(--color-bg-root)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "var(--color-accent-subtle)",
            border: "1px solid var(--color-accent-muted)",
          }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Start a Project
        </h2>
        <p
          className="text-sm text-center max-w-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Create a new project from the sidebar to begin building with AI
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--color-bg-root)" }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center">
              <Sparkles
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: "var(--color-accent)", opacity: 0.3 }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Describe what you want to build
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isChatLoading && messages[messages.length - 1]?.role === "user" && (
              <div
                className="px-4 py-3"
                style={{ background: "var(--color-bg-surface)" }}
              >
                <div className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "var(--color-accent-subtle)",
                      border: "1px solid var(--color-accent-muted)",
                    }}
                  >
                    <Sparkles
                      className="w-3.5 h-3.5 animate-pulse-subtle"
                      style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse-subtle"
                      style={{ background: "var(--color-accent)", animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse-subtle"
                      style={{ background: "var(--color-accent)", animationDelay: "300ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse-subtle"
                      style={{ background: "var(--color-accent)", animationDelay: "600ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: "1px solid var(--color-border-default)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-4 py-2 transition-all duration-200"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm py-1"
            style={{
              color: "var(--color-text-primary)",
              maxHeight: "120px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
            onFocus={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.borderColor = "var(--color-accent-muted)";
                parent.style.boxShadow = "0 0 0 3px var(--color-accent-glow)";
              }
            }}
            onBlur={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.borderColor = "var(--color-border-default)";
                parent.style.boxShadow = "none";
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatLoading}
            className="p-2 rounded-lg transition-all duration-150 flex-shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim()
                ? "var(--color-accent)"
                : "var(--color-bg-elevated)",
              color: input.trim()
                ? "var(--color-text-inverse)"
                : "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isChatLoading) {
                e.currentTarget.style.background = "var(--color-accent-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (input.trim()) {
                e.currentTarget.style.background = "var(--color-accent)";
              }
            }}
          >
            {isChatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p
          className="text-[11px] mt-1.5 text-center"
          style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
        >
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ============================================
// Parse file operations from AI response
// ============================================

function parseFileOperations(content: string) {
  const operations: Array<{
    type: "create" | "edit" | "delete";
    filePath: string;
    content: string;
  }> = [];

  // Match <boltAction type="file" filePath="...">content</boltAction>
  // Also handle variations like filePath before type
  const regex =
    /<boltAction\s+(?:type="file"\s+filePath="([^"]+)"|filePath="([^"]+)"\s+type="file")>([\s\S]*?)<\/boltAction>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    let filePath = match[1] || match[2];
    const fileContent = (match[3] || "").trim();

    // Strip common subdirectory prefixes (e.g., "todo-app/src/App.tsx" → "src/App.tsx")
    // Detect if ALL files share a common prefix like "project-name/"
    filePath = stripProjectPrefix(filePath);

    operations.push({
      type: "create",
      filePath,
      content: fileContent,
    });
  }

  return operations;
}

/**
 * Strip a project subdirectory prefix from a file path.
 * E.g., "todo-app/src/App.tsx" → "src/App.tsx"
 * We detect this by checking if the first segment is NOT a known directory.
 */
function stripProjectPrefix(filePath: string): string {
  const knownRoots = [
    "src", "public", "app", "pages", "components", "lib", "utils",
    "hooks", "types", "styles", "assets", "config", "test", "tests",
    "__tests__", "node_modules", ".github",
  ];
  const knownRootFiles = [
    "package.json", "tsconfig.json", "vite.config.ts", "vite.config.js",
    "tailwind.config.js", "tailwind.config.ts", "postcss.config.js",
    "postcss.config.mjs", "postcss.config.cjs", "index.html",
    "next.config.js", "next.config.ts", "next.config.mjs",
    ".eslintrc.json", ".eslintrc.js", ".gitignore", "README.md",
  ];

  // If the path itself is a known root file, return as-is
  if (knownRootFiles.includes(filePath)) return filePath;

  const parts = filePath.split("/");
  if (parts.length < 2) return filePath;

  const firstSegment = parts[0];

  // If the first segment is a known root directory, keep it
  if (knownRoots.includes(firstSegment)) return filePath;

  // If the first segment looks like a project name (not a known dir), strip it
  // Check if second segment is a known root or a known file
  const remainingPath = parts.slice(1).join("/");
  const secondSegment = parts[1];

  if (
    knownRoots.includes(secondSegment) ||
    knownRootFiles.includes(remainingPath) ||
    knownRootFiles.includes(secondSegment)
  ) {
    return remainingPath;
  }

  return filePath;
}
