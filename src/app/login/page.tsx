"use client";

import { useEffect, useState } from "react";
import { onAuthChange } from "@/lib/firebase";
import { LoginPage } from "@/components/auth/LoginPage";

/**
 * /login route — served WITHOUT COOP/COEP headers so Firebase popup auth works.
 * After successful auth, LoginPage redirects to "/" with a full page load
 * so the IDE picks up the COOP/COEP headers needed for WebContainers.
 */
export default function LoginRoute() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If user is already authenticated, send them straight to the IDE
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        // Full page navigation so the browser fetches "/" with COOP/COEP headers
        window.location.href = "/";
      } else {
        setChecking(false);
      }
    });

    // Safety timeout — don't hang forever
    const timeout = setTimeout(() => setChecking(false), 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (checking) {
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
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return <LoginPage />;
}
