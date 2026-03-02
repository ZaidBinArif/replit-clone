"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";

/**
 * Auto-triggers AI generation when a project has exactly 1 user message
 * and no assistant response yet (i.e., newly created project).
 */
export function useAutoChat() {
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const isChatLoading = useProjectStore((s) => s.isChatLoading);
  const setChatLoading = useProjectStore((s) => s.setChatLoading);
  const addMessage = useProjectStore((s) => s.addMessage);
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!activeProject) return;
    if (isChatLoading) return;
    if (triggeredRef.current.has(activeProject.id)) return;

    const messages = activeProject.messages;
    // Only trigger if there's exactly 1 user message and no assistant reply
    if (
      messages.length === 1 &&
      messages[0].role === "user"
    ) {
      triggeredRef.current.add(activeProject.id);
      triggerAI(activeProject.id, messages[0].content);
    }

    async function triggerAI(projectId: string, userMessage: string) {
      setChatLoading(true);
      try {
        const currentProject = useProjectStore.getState().getActiveProject();
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            message: userMessage,
            project: currentProject,
          }),
        });

        if (!response.ok) throw new Error("AI request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        // Add placeholder assistant message
        addMessage(projectId, {
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
            .updateLastAssistantMessage(projectId, fullContent);
        }

        // Parse and apply file operations
        const fileOps = parseFileOps(fullContent);
        if (fileOps.length > 0) {
          useProjectStore
            .getState()
            .applyFileOperations(projectId, fileOps);
        }
      } catch (error) {
        console.error("Auto chat error:", error);
        addMessage(projectId, {
          role: "assistant",
          content: "Sorry, I encountered an error setting up the project. Please try sending a message.",
          timestamp: Date.now(),
        });
      } finally {
        setChatLoading(false);
      }
    }
  }, [activeProject, isChatLoading, setChatLoading, addMessage]);
}

function parseFileOps(content: string) {
  const operations: Array<{
    type: "create" | "edit" | "delete";
    filePath: string;
    content: string;
  }> = [];

  const regex =
    /<boltAction\s+type="file"\s+filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    operations.push({
      type: "create",
      filePath: match[1],
      content: match[2].trim(),
    });
  }

  return operations;
}
