"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { ChatMessage } from "./ChatMessage";
import { runCommand } from "@/lib/webcontainer";
import { Send, Loader2, Sparkles, MessageSquare } from "lucide-react";

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isChatLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeProjectId]);

  const handleSend = async () => {
    if (!input.trim() || !activeProjectId || isChatLoading) return;

    const userMessage = input.trim();
    setInput("");

    addMessage(activeProjectId, {
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    setChatLoading(true);
    try {
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

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

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

        useProjectStore
          .getState()
          .updateLastAssistantMessage(activeProjectId, fullContent);
      }

      const fileOps = parseFileOperations(fullContent);
      if (fileOps.length > 0) {
        useProjectStore
          .getState()
          .applyFileOperations(activeProjectId, fileOps);
      }

      const shellOps = parseShellOperations(fullContent);
      for (const cmd of shellOps) {
        try {
          await runCommand(cmd);
        } catch (e) {
          console.error(`Shell command failed: ${cmd}`, e);
        }
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

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 bg-[#0c0c14]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 text-indigo-400/60" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] text-zinc-500">
          Select a project to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0c0c14]">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 h-[42px] flex-shrink-0 border-b border-white/[0.04]">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[12px] font-semibold tracking-wide text-zinc-300 uppercase">
          AI Copilot
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-indigo-400" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] text-white font-medium mb-1">
              CodeStudio AI is ready
            </p>
            <p className="text-[13px] text-zinc-500 max-w-[240px]">
              Ask me to build a feature, fix a bug, or explain code.
            </p>
          </div>
        ) : (
          <div className="py-3 space-y-1">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isChatLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="px-5 py-3">
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-500/15">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1.5 h-7">
                    <span className="text-[13px] text-zinc-500 italic">AI is setting up your project...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.04]">
        <div className="relative flex flex-col rounded-xl bg-[#12121a] border border-white/[0.06] focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to code..."
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-[13px] text-zinc-200 placeholder:text-zinc-600 px-4 py-3 min-h-[44px] max-h-[200px]"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />
          <div className="flex justify-between items-center px-3 pb-2.5">
            <span className="text-[11px] text-zinc-600">
              Press ⏎ to send
            </span>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isChatLoading}
              className={`p-1.5 rounded-lg transition-all ${
                input.trim() && !isChatLoading
                  ? "bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                  : "bg-transparent text-zinc-700 cursor-not-allowed"
              }`}
            >
              {isChatLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
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

  const regex =
    /<boltAction\s+(?:type="file"\s+filePath="([^"]+)"|filePath="([^"]+)"\s+type="file")>([\s\S]*?)<\/boltAction>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    let filePath = match[1] || match[2];
    const fileContent = (match[3] || "").trim();

    filePath = stripProjectPrefix(filePath);

    operations.push({
      type: "create",
      filePath,
      content: fileContent,
    });
  }

  return operations;
}

function parseShellOperations(content: string): string[] {
  const commands: string[] = [];
  const regex = /<boltAction\s+type="shell"\s+command="([^"]+)"\s*\/>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    commands.push(match[1]);
  }
  return commands;
}

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

  if (knownRootFiles.includes(filePath)) return filePath;

  const parts = filePath.split("/");
  if (parts.length < 2) return filePath;

  const firstSegment = parts[0];

  if (knownRoots.includes(firstSegment)) return filePath;

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
