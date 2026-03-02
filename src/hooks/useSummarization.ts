"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import { runSummarization } from "@/lib/summarizer";

/**
 * Runs async summarization after each AI response.
 * Non-blocking — user never waits for this.
 */
export function useSummarization() {
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const isChatLoading = useProjectStore((s) => s.isChatLoading);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    if (!activeProject) return;
    if (isChatLoading) return;

    const messageCount = activeProject.messages.length;

    // Only run when a new message has been added (and loading is done)
    if (messageCount <= lastMessageCountRef.current) return;
    lastMessageCountRef.current = messageCount;

    // Only run when last message is from assistant (AI just finished)
    const lastMessage = activeProject.messages[messageCount - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;

    // Run summarization asynchronously
    const projectId = activeProject.id;
    runSummarization(activeProject, (updates) => {
      const store = useProjectStore.getState();
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return;

      store.setProjects(
        store.projects.map((p) =>
          p.id === projectId ? { ...p, ...updates } : p
        )
      );
    }).catch(console.error);
  }, [activeProject, isChatLoading]);
}
