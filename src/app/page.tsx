"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { onAuthChange } from "@/lib/firebase";
import { IDELayout } from "@/components/layout/IDELayout";

/**
 * Main IDE page — served WITH COOP/COEP headers (via middleware).
 * crossOriginIsolated = true here, so WebContainers work.
 * Firestore read/write also works (uses fetch/CORS, unaffected by COOP/COEP).
 *
 * If the user is not authenticated, we redirect to /login (which has NO
 * COOP/COEP headers, so Firebase popup auth works there).
 */
export default function Home() {
  const user = useProjectStore((s) => s.user);
  const setUser = useProjectStore((s) => s.setUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for guest mode first
    const isGuest = typeof window !== "undefined" && sessionStorage.getItem("codestudio_guest") === "true";
    if (isGuest) {
      setUser({
        uid: "dev-user",
        email: "dev@codestudio.ai",
        displayName: "Developer",
        photoURL: "",
      });
      setIsLoading(false);
      return () => {};
    }

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
        // Not authenticated — send to /login (no COOP/COEP there)
        window.location.href = "/login";
      }
    });

    // Safety timeout — if auth check hangs, redirect to login
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
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "var(--color-bg-root)" }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: "var(--color-border-default)",
              borderTopColor: "var(--color-accent)",
            }}
          />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading CodeStudio...
          </p>
        </div>
      </div>
    );
  }

  return <IDELayout />;
}
