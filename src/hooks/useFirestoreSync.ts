"use client";

import { useEffect, useRef, useCallback } from "react";
import { useProjectStore } from "@/stores/project-store";
import {
  saveProject,
  loadUserProjects,
  deleteProjectFromDB,
} from "@/lib/firebase";
import type { Project } from "@/types";

/**
 * Hook that syncs Zustand project state with Firestore.
 *
 * - Loads user projects from Firestore on mount
 * - Auto-saves projects to Firestore when they change (debounced 2s)
 * - Saves immediately on critical events (project create, AI response done)
 */
export function useFirestoreSync() {
  const user = useProjectStore((s) => s.user);
  const projects = useProjectStore((s) => s.projects);
  const setProjects = useProjectStore((s) => s.setProjects);
  const isChatLoading = useProjectStore((s) => s.isChatLoading);

  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<Record<string, string>>({}); // projectId -> updatedAt fingerprint
  const prevChatLoadingRef = useRef(false);

  // ============================================
  // Load projects from Firestore on login
  // ============================================
  useEffect(() => {
    if (!user || user.uid === "dev-user") {
      hasLoadedRef.current = false;
      return;
    }

    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const load = async () => {
      try {
        console.log("[Firestore] Loading projects for user:", user.uid);
        const firestoreProjects = await loadUserProjects(user.uid);

        if (firestoreProjects.length > 0) {
          // Map Firestore docs to Project type
          const mapped: Project[] = firestoreProjects.map((p: any) => ({
            id: p.id,
            userId: p.userId || user.uid,
            title: p.title || "Untitled",
            framework: p.framework || "react",
            createdAt: p.createdAt || Date.now(),
            updatedAt: p.updatedAt?.toMillis?.() || p.updatedAt || Date.now(),
            files: p.files || {},
            messages: p.messages || [],
            contextState: p.contextState || {
              tierA_summary: "",
              tierA_coversUpTo: -1,
              tierB_startFrom: 0,
            },
          }));

          // Merge with any in-memory projects (in case user created one before load finished)
          const currentProjects = useProjectStore.getState().projects;
          const currentIds = new Set(currentProjects.map((p) => p.id));
          const mergedProjects = [...currentProjects];

          for (const fp of mapped) {
            if (!currentIds.has(fp.id)) {
              mergedProjects.push(fp);
            }
          }

          setProjects(mergedProjects);
          console.log(
            `[Firestore] Loaded ${firestoreProjects.length} projects`
          );

          // Initialize fingerprints so we don't re-save on first render
          for (const p of mergedProjects) {
            lastSavedRef.current[p.id] = projectFingerprint(p);
          }
        }
      } catch (error) {
        console.error("[Firestore] Error loading projects:", error);
      }
    };

    load();
  }, [user, setProjects]);

  // ============================================
  // Auto-save projects when they change (debounced)
  // ============================================
  useEffect(() => {
    if (!user || user.uid === "dev-user") return;
    if (!hasLoadedRef.current) return;

    // Don't save while AI is streaming — too many intermediate states
    if (isChatLoading) return;

    // Debounce: save 2 seconds after the last change
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveChangedProjects(projects, user.uid);
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, user, isChatLoading]);

  // ============================================
  // Save immediately when AI finishes responding
  // ============================================
  useEffect(() => {
    if (!user || user.uid === "dev-user") return;

    // Detect transition: isChatLoading true → false (AI just finished)
    if (prevChatLoadingRef.current && !isChatLoading) {
      // Clear any pending debounce timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Save immediately
      const currentProjects = useProjectStore.getState().projects;
      saveChangedProjects(currentProjects, user.uid);
    }

    prevChatLoadingRef.current = isChatLoading;
  }, [isChatLoading, user]);

  /**
   * Save only projects that actually changed since last save
   */
  const saveChangedProjects = useCallback(
    async (currentProjects: Project[], userId: string) => {
      for (const project of currentProjects) {
        if (project.userId !== userId && project.userId !== "") continue;

        const fingerprint = projectFingerprint(project);
        if (lastSavedRef.current[project.id] === fingerprint) continue;

        // This project changed — save it
        console.log(`[Firestore] Saving project: ${project.title}`);
        try {
          await saveProject({
            ...project,
            userId, // Ensure userId is set
          });
          lastSavedRef.current[project.id] = fingerprint;
        } catch (error) {
          console.error(
            `[Firestore] Error saving project ${project.id}:`,
            error
          );
        }
      }
    },
    []
  );
}

/**
 * Simple fingerprint to detect if a project has changed.
 * Uses updatedAt + message count + file count.
 */
function projectFingerprint(project: Project): string {
  return `${project.updatedAt}:${project.messages.length}:${Object.keys(project.files).length}:${project.title}`;
}
