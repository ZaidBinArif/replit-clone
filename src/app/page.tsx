"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { onAuthChange } from "@/lib/firebase";
import { IDELayout } from "@/components/layout/IDELayout";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { useFirestoreSync } from "@/hooks/useFirestoreSync";

/**
 * Main page — served WITH COOP/COEP headers (via next.config headers).
 *
 * When authenticated:
 *   - No active project → show Dashboard (project grid)
 *   - Active project selected → show IDE layout
 *
 * When not authenticated → redirect to /login.
 */
export default function Home() {
  const setUser = useProjectStore((s) => s.setUser);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const [isLoading, setIsLoading] = useState(true);

  useFirestoreSync();

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
        });
        setIsLoading(false);
      } else {
        window.location.href = "/login";
      }
    });

    const timeout = setTimeout(() => {
      if (!useProjectStore.getState().user) {
        window.location.href = "/login";
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-500">Loading CodeStudio...</p>
        </div>
      </div>
    );
  }

  if (!activeProjectId) {
    return <DashboardPage />;
  }

  return <IDELayout />;
}
