"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import {
  startProject,
  writeFilesToContainer,
  updateFileInContainer,
} from "@/lib/webcontainer";
import type { ProjectFile } from "@/types";
import {
  RefreshCw,
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Terminal,
  Play,
} from "lucide-react";

type ViewportSize = "desktop" | "tablet" | "mobile";

const viewportWidths: Record<ViewportSize, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

/**
 * Compute a simple fingerprint of all file contents.
 */
function computeFilesFingerprint(files: Record<string, ProjectFile>): string {
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  return entries
    .map(([path, f]) => `${path}:${f.content.length}:${f.lastEdited || 0}`)
    .join("|");
}

export function PreviewPanel() {
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const showPreview = useProjectStore((s) => s.showPreview);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [logs, setLogs] = useState<string>("");
  const [showLogs, setShowLogs] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Refs for tracking state across renders
  const lastProjectIdRef = useRef<string | null>(null);
  const hasBootedRef = useRef(false);
  const isBootingRef = useRef(false);
  const lastFingerprintRef = useRef<string>("");
  const lastFilesSnapshotRef = useRef<Record<string, ProjectFile>>({});
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((data: string) => {
    setLogs((prev) => prev + data);
  }, []);

  // ============================================
  // Effect 1: Boot WebContainer when project first gets files
  // ============================================
  useEffect(() => {
    if (!activeProject) return;
    if (!showPreview) return;

    const fileCount = Object.keys(activeProject.files).length;
    if (fileCount === 0) return;

    // If project changed, reset state (WebContainer singleton persists)
    if (lastProjectIdRef.current !== activeProject.id) {
      hasBootedRef.current = false;
      isBootingRef.current = false;
      lastFingerprintRef.current = "";
      lastFilesSnapshotRef.current = {};
      setPreviewUrl(null);
      setLogs("");
    }

    lastProjectIdRef.current = activeProject.id;

    // If already booted or currently booting, skip
    if (hasBootedRef.current || isBootingRef.current) return;

    // Boot the WebContainer
    isBootingRef.current = true;
    setIsBooting(true);

    const boot = async () => {
      try {
        addLog("⚡ Booting WebContainer...\n");
        await startProject(activeProject.files, addLog, (url) => {
          setPreviewUrl(url);
          hasBootedRef.current = true;
          isBootingRef.current = false;
          // Take snapshot using CURRENT store state (not stale closure)
          const currentProject = useProjectStore.getState().getActiveProject();
          const currentFiles = currentProject?.files || activeProject.files;
          lastFingerprintRef.current = computeFilesFingerprint(currentFiles);
          lastFilesSnapshotRef.current = { ...currentFiles };

          // If files changed during boot, sync them immediately
          const bootFingerprint = computeFilesFingerprint(activeProject.files);
          if (lastFingerprintRef.current !== bootFingerprint) {
            addLog("\n🔄 Files changed during boot, syncing...\n");
            writeFilesToContainer(currentFiles).catch(console.error);
          }
        });
      } catch (error) {
        console.error("WebContainer boot error:", error);
        addLog(`\n❌ Error: ${error}\n`);
        isBootingRef.current = false;
        generateFallbackPreview(activeProject.files);
      } finally {
        setIsBooting(false);
      }
    };

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, activeProject && Object.keys(activeProject.files).length, showPreview]);

  // ============================================
  // Effect 2: Sync file changes to running WebContainer (debounced)
  // ============================================
  useEffect(() => {
    if (!activeProject) return;
    if (!hasBootedRef.current) return;
    if (activeProject.id !== lastProjectIdRef.current) return;

    const currentFingerprint = computeFilesFingerprint(activeProject.files);
    if (currentFingerprint === lastFingerprintRef.current) return;

    // Debounce: wait 500ms after last change before writing
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    const filesToSync = activeProject.files;
    syncTimerRef.current = setTimeout(() => {
      syncFilesToContainer(filesToSync);
    }, 500);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.files]);

  /**
   * Write only changed files to the WebContainer
   */
  const syncFilesToContainer = useCallback(
    async (currentFiles: Record<string, ProjectFile>) => {
      const prevFiles = lastFilesSnapshotRef.current;
      const changedFiles: Record<string, ProjectFile> = {};
      let changeCount = 0;

      for (const [path, file] of Object.entries(currentFiles)) {
        const prevFile = prevFiles[path];
        if (!prevFile || prevFile.content !== file.content) {
          changedFiles[path] = file;
          changeCount++;
        }
      }

      if (changeCount === 0) return;

      setIsSyncing(true);
      addLog(`\n🔄 Syncing ${changeCount} changed file(s)...\n`);

      try {
        if (changeCount <= 3) {
          for (const [path, file] of Object.entries(changedFiles)) {
            await updateFileInContainer(path, file.content);
            addLog(`  ✓ ${path}\n`);
          }
        } else {
          await writeFilesToContainer(changedFiles);
          addLog(`  ✓ ${Object.keys(changedFiles).join(", ")}\n`);
        }

        lastFingerprintRef.current = computeFilesFingerprint(currentFiles);
        lastFilesSnapshotRef.current = { ...currentFiles };
      } catch (error) {
        console.error("File sync error:", error);
        addLog(`\n⚠️ Sync error: ${error}\n`);
      } finally {
        setIsSyncing(false);
      }
    },
    [addLog]
  );

  // ============================================
  // Manual recompile: write ALL files and refresh iframe
  // ============================================
  const handleRecompile = useCallback(async () => {
    if (!activeProject || !hasBootedRef.current) return;

    setIsSyncing(true);
    addLog("\n🔨 Recompiling — writing all files...\n");

    try {
      // Write ALL current files to WebContainer (not just changed ones)
      await writeFilesToContainer(activeProject.files);

      // Update snapshot
      lastFingerprintRef.current = computeFilesFingerprint(activeProject.files);
      lastFilesSnapshotRef.current = { ...activeProject.files };

      addLog(`  ✓ ${Object.keys(activeProject.files).length} files written\n`);

      // Give Vite a moment to pick up changes, then refresh iframe
      setTimeout(() => {
        if (iframeRef.current && previewUrl) {
          iframeRef.current.src = previewUrl;
          addLog("  ✓ Preview refreshed\n");
        }
      }, 1000);
    } catch (error) {
      console.error("Recompile error:", error);
      addLog(`\n⚠️ Recompile error: ${error}\n`);
    } finally {
      setIsSyncing(false);
    }
  }, [activeProject, previewUrl, addLog]);

  // ============================================
  // Fallback: generate static HTML preview
  // ============================================
  const generateFallbackPreview = useCallback(
    (files: Record<string, ProjectFile>) => {
      const indexHtml = files["index.html"]?.content;
      const globalCss =
        files["src/index.css"]?.content ||
        files["src/globals.css"]?.content ||
        files["src/app/globals.css"]?.content ||
        "";

      let html = "";
      if (indexHtml) {
        html = indexHtml;
      } else {
        html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.tailwindcss.com"><\/script>
<style>${globalCss}</style>
</head><body class="bg-gray-50 min-h-screen flex items-center justify-center">
<div class="text-center p-8">
  <div class="text-4xl mb-4">🚀</div>
  <h2 class="text-xl font-semibold text-gray-800 mb-2">Project Ready</h2>
  <p class="text-gray-500 text-sm max-w-sm">
    ${Object.keys(files).length} files created.
    WebContainer will provide full framework preview.
  </p>
  <div class="mt-4 flex flex-wrap gap-2 justify-center">
    ${Object.keys(files)
      .slice(0, 8)
      .map(
        (f) =>
          `<span class="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">${f}</span>`
      )
      .join("")}
  </div>
</div>
</body></html>`;
      }

      const blob = new Blob([html], { type: "text/html" });
      setPreviewUrl(URL.createObjectURL(blob));
    },
    []
  );

  const handleRefresh = () => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
    }
  };

  if (!showPreview || !activeProject) return null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "var(--color-bg-root)",
        borderTop: "1px solid var(--color-border-default)",
      }}
    >
      {/* Browser toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
        style={{
          background: "var(--color-bg-surface)",
          borderBottom: "1px solid var(--color-border-default)",
        }}
      >
        {/* URL bar */}
        <div
          className="flex items-center gap-2 flex-1 px-3 py-1 rounded-md"
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          {isBooting ? (
            <Loader2
              className="w-3 h-3 animate-spin"
              style={{ color: "var(--color-accent)" }}
            />
          ) : isSyncing ? (
            <Loader2
              className="w-3 h-3 animate-spin"
              style={{ color: "var(--color-warning, #f59e0b)" }}
            />
          ) : (
            <Globe
              className="w-3 h-3"
              style={{
                color: previewUrl
                  ? "var(--color-success)"
                  : "var(--color-text-muted)",
              }}
            />
          )}
          <span
            className="text-xs truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {isBooting
              ? "Starting dev server..."
              : isSyncing
              ? "Syncing files..."
              : previewUrl
              ? "localhost:3000"
              : "No preview available"}
          </span>
        </div>

        {/* Viewport toggles */}
        <div className="flex items-center gap-0.5">
          {(
            [
              { id: "desktop", icon: Monitor },
              { id: "tablet", icon: Tablet },
              { id: "mobile", icon: Smartphone },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewport(id)}
              className="p-1.5 rounded-md transition-colors duration-150 cursor-pointer"
              style={{
                color:
                  viewport === id
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                background:
                  viewport === id
                    ? "var(--color-accent-subtle)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (viewport !== id) {
                  e.currentTarget.style.background = "var(--color-bg-elevated)";
                }
              }}
              onMouseLeave={(e) => {
                if (viewport !== id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
              title={id}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Toggle logs */}
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="p-1.5 rounded-md transition-colors duration-150 cursor-pointer"
          style={{
            color: showLogs ? "var(--color-accent)" : "var(--color-text-muted)",
            background: showLogs ? "var(--color-accent-subtle)" : "transparent",
          }}
          title="Toggle terminal logs"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        {/* Recompile button */}
        <button
          onClick={handleRecompile}
          disabled={!hasBootedRef.current || isSyncing || isBooting}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: "var(--color-accent)",
            background: "var(--color-accent-subtle)",
            border: "1px solid var(--color-accent-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-muted)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent-subtle)";
          }}
          title="Write all files to WebContainer and refresh preview"
        >
          <Play className="w-3 h-3" />
          Recompile
        </button>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md transition-colors duration-150 cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-elevated)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
          title="Refresh iframe"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md transition-colors duration-150 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-bg-elevated)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview iframe */}
        <div
          className="flex-1 flex items-start justify-center overflow-auto"
          style={{ display: showLogs ? undefined : "flex" }}
        >
          {isBooting ? (
            <div className="flex flex-col items-center justify-center h-full w-full gap-3">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "var(--color-accent)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Booting environment...
              </p>
            </div>
          ) : previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="bg-white"
              style={{
                width: viewportWidths[viewport],
                height: "100%",
                maxWidth: "100%",
                border: "none",
                transition: "width 300ms ease",
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              title="Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center">
                <Monitor
                  className="w-8 h-8 mx-auto mb-3 opacity-15"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Preview will appear here
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
                >
                  Files need to be generated first
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Terminal logs panel */}
        {showLogs && (
          <div
            className="flex-shrink-0 overflow-hidden flex flex-col"
            style={{
              width: "40%",
              borderLeft: "1px solid var(--color-border-default)",
              background: "var(--color-bg-surface)",
            }}
          >
            <div
              className="px-3 py-1.5 flex items-center justify-between flex-shrink-0"
              style={{
                borderBottom: "1px solid var(--color-border-default)",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Terminal
              </span>
            </div>
            <pre
              className="flex-1 overflow-auto p-3 text-xs leading-relaxed"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-secondary)",
              }}
            >
              {logs || "Waiting for project to start...\n"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
