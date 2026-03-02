"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Code2, Sparkles, Zap, Layers } from "lucide-react";

/**
 * LoginPage component — rendered on /login (no COOP/COEP headers).
 * After successful Google sign-in, we do window.location.href = "/"
 * to navigate to the IDE with a full page load, picking up the
 * COOP/COEP headers that enable WebContainers.
 */
export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Full page navigation to "/" so browser fetches with COOP/COEP headers
      window.location.href = "/";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    // For guest mode, we store a flag and navigate to IDE
    // The IDE page will check for this flag
    if (typeof window !== "undefined") {
      sessionStorage.setItem("codestudio_guest", "true");
      window.location.href = "/";
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "var(--color-bg-root)" }}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[40%] -left-[20%] w-[60%] h-[80%] rounded-full opacity-[0.03]"
          style={{
            background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-[30%] -right-[10%] w-[50%] h-[70%] rounded-full opacity-[0.02]"
          style={{
            background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--color-border-default) 1px, transparent 1px),
              linear-gradient(90deg, var(--color-border-default) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{
              background: "var(--color-accent-subtle)",
              border: "1px solid var(--color-accent-muted)",
            }}
          >
            <Code2 className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
          </div>
          <h1
            className="text-3xl font-semibold tracking-tight mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            CodeStudio
          </h1>
          <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
            Build applications with AI, faster than ever
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[
            { icon: Sparkles, label: "AI Powered" },
            { icon: Zap, label: "Live Preview" },
            { icon: Layers, label: "Multi-Framework" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Icon className="w-3 h-3" style={{ color: "var(--color-accent)" }} />
              {label}
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--color-text-primary)",
            color: "var(--color-text-inverse)",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(250, 250, 249, 0.12)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {isLoading ? (
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--color-text-muted)",
                borderTopColor: "var(--color-text-inverse)",
              }}
            />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {/* Guest mode */}
        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ borderTop: "1px solid var(--color-border-default)" }} />
          </div>
          <div className="relative flex justify-center">
            <span
              className="px-3 text-xs"
              style={{ background: "var(--color-bg-root)", color: "var(--color-text-muted)" }}
            >
              or
            </span>
          </div>
        </div>

        <button
          onClick={handleGuestMode}
          className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer"
          style={{
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-default)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border-active)";
            e.currentTarget.style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border-default)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          Continue as Guest
        </button>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
