"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import {
  startProject,
  writeFilesToContainer,
  updateFileInContainer,
  restartDevServer,
  runCommand,
  readDistFiles,
} from "@/lib/webcontainer";
import { downloadProjectZip } from "@/lib/download";
import type { ProjectFile } from "@/types";
import {
  RefreshCw,
  ExternalLink,
  Globe,
  Loader2,
  RotateCcw,
  Download,
  Rocket,
  ChevronUp,
  ChevronDown,
  ScrollText,
} from "lucide-react";

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
  const [isRestarting, setIsRestarting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const lastProjectIdRef = useRef<string | null>(null);
  const hasBootedRef = useRef(false);
  const isBootingRef = useRef(false);
  const lastFingerprintRef = useRef("");
  const lastFilesSnapshotRef = useRef<Record<string, ProjectFile>>({});
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((data: string) => {
    setLogs((prev) => prev + data);
  }, []);

  useEffect(() => {
    if (showLogs) logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, showLogs]);

  // Boot WebContainer when project first gets files
  useEffect(() => {
    if (!activeProject || !showPreview) return;
    const fileCount = Object.keys(activeProject.files).length;
    if (fileCount === 0) return;

    if (lastProjectIdRef.current !== activeProject.id) {
      hasBootedRef.current = false;
      isBootingRef.current = false;
      lastFingerprintRef.current = "";
      lastFilesSnapshotRef.current = {};
      setPreviewUrl(null);
      setLogs("");
      setDeployUrl(null);
    }

    lastProjectIdRef.current = activeProject.id;
    if (hasBootedRef.current || isBootingRef.current) return;

    isBootingRef.current = true;
    setIsBooting(true);

    const boot = async () => {
      try {
        addLog("⚡ Booting WebContainer...\n");
        await startProject(activeProject.files, addLog, (url) => {
          setPreviewUrl(url);
          hasBootedRef.current = true;
          isBootingRef.current = false;
          const currentProject = useProjectStore.getState().getActiveProject();
          const currentFiles = currentProject?.files || activeProject.files;
          lastFingerprintRef.current = computeFilesFingerprint(currentFiles);
          lastFilesSnapshotRef.current = { ...currentFiles };

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
      } finally {
        setIsBooting(false);
      }
    };

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, activeProject && Object.keys(activeProject.files).length, showPreview]);

  // Sync file changes to running WebContainer (debounced)
  useEffect(() => {
    if (!activeProject || !hasBootedRef.current) return;
    if (activeProject.id !== lastProjectIdRef.current) return;

    const currentFingerprint = computeFilesFingerprint(activeProject.files);
    if (currentFingerprint === lastFingerprintRef.current) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    const filesToSync = activeProject.files;
    syncTimerRef.current = setTimeout(() => {
      syncFilesToContainer(filesToSync);
    }, 500);

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.files]);

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
      try {
        if (changeCount <= 3) {
          for (const [path, file] of Object.entries(changedFiles)) {
            await updateFileInContainer(path, file.content);
          }
        } else {
          await writeFilesToContainer(changedFiles);
        }
        lastFingerprintRef.current = computeFilesFingerprint(currentFiles);
        lastFilesSnapshotRef.current = { ...currentFiles };
      } catch (error) {
        console.error("File sync error:", error);
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const handleRefresh = () => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
    }
  };

  const handleRestart = useCallback(async () => {
    if (!activeProject) return;
    setIsRestarting(true);
    setPreviewUrl(null);
    setLogs("");
    addLog("🔄 Full restart...\n");
    try {
      await restartDevServer(activeProject.files, addLog, (url) => {
        setPreviewUrl(url);
        hasBootedRef.current = true;
        lastFingerprintRef.current = computeFilesFingerprint(activeProject.files);
        lastFilesSnapshotRef.current = { ...activeProject.files };
      });
    } catch (error) {
      addLog(`\n❌ Restart error: ${error}\n`);
    } finally {
      setIsRestarting(false);
    }
  }, [activeProject, addLog]);

  const handleDownload = useCallback(() => {
    if (!activeProject) return;
    downloadProjectZip(activeProject.title, activeProject.files);
  }, [activeProject]);

  const handleDeploy = useCallback(async () => {
    if (!activeProject) return;
    setIsDeploying(true);
    setDeployUrl(null);
    setShowLogs(true);
    addLog("\n━━━ DEPLOY START ━━━\n");

    try {
      addLog("Step 1: Running 'vite build' in WebContainer...\n");
      const buildExit = await runCommand("npx vite build", addLog);
      addLog(`\nBuild exit code: ${buildExit}\n`);
      if (buildExit !== 0) {
        addLog("❌ Build failed. Fix errors and try again.\n");
        setIsDeploying(false);
        return;
      }

      addLog("\nStep 2: Reading build output from WebContainer...\n");
      const builtFiles = await readDistFiles();
      const fileKeys = Object.keys(builtFiles);
      addLog(`Found ${fileKeys.length} files in build output:\n`);
      for (const key of fileKeys) {
        const size = builtFiles[key].content.length;
        addLog(`  ${key} (${size} bytes)\n`);
      }

      if (fileKeys.length === 0) {
        addLog("❌ No build output found in dist/ or build/\n");
        setIsDeploying(false);
        return;
      }

      addLog(`\nStep 3: Sending ${fileKeys.length} files to /api/deploy...\n`);
      const payload = {
        projectId: activeProject.id,
        title: activeProject.title,
        files: builtFiles,
        netlifyId: activeProject.netlifyId,
      };
      addLog(`Payload size: ~${JSON.stringify(payload).length} bytes\n`);

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      addLog(`API response status: ${res.status}\n`);
      const data = await res.json();
      addLog(`API response: ${JSON.stringify(data, null, 2)}\n`);

      if (data.url) {
        setDeployUrl(data.url);
        addLog(`\n✅ Deployed: ${data.url}\n`);
        if (data.siteId) {
          useProjectStore.getState().updateProjectMeta(activeProject.id, {
            netlifyId: data.siteId,
            lastDeployUrl: data.url,
          });
        }
      } else {
        addLog(`\n❌ Deploy failed: ${data.error || "Unknown error"}\n`);
      }
    } catch (error) {
      addLog(`\n❌ Deploy error: ${error}\n`);
    } finally {
      addLog("━━━ DEPLOY END ━━━\n");
      setIsDeploying(false);
    }
  }, [activeProject, addLog]);

  if (!showPreview || !activeProject) return null;

  const busy = isBooting || isRestarting;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#1e1e1e] border-t border-[#2b2b2b]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 h-[36px] flex-shrink-0 bg-[#252526] border-b border-[#2b2b2b]">
        <button
          onClick={handleRefresh}
          disabled={busy}
          className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* URL bar */}
        <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1 rounded bg-[#3c3c3c] mx-1">
          {busy ? (
            <Loader2 className="w-3 h-3 animate-spin text-[#007acc]" />
          ) : isSyncing ? (
            <Loader2 className="w-3 h-3 animate-spin text-[#cca700]" />
          ) : (
            <Globe className={`w-3 h-3 ${previewUrl ? "text-[#89d185]" : "text-[#666]"}`} />
          )}
          <span className="text-[11px] font-mono text-[#ccc] truncate">
            {busy
              ? "Starting server..."
              : isSyncing
              ? "Syncing..."
              : previewUrl
              ? "localhost:3000"
              : "No preview"}
          </span>
        </div>

        <button
          onClick={handleRestart}
          disabled={busy}
          className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          title="Full Restart (npm install + dev)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDownload}
          className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white cursor-pointer"
          title="Download project as ZIP"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDeploy}
          disabled={isDeploying || busy}
          className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          title="Build & Deploy to Netlify"
        >
          {isDeploying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Rocket className="w-3.5 h-3.5" />
          )}
        </button>

        {deployUrl && (
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#89d185] hover:underline truncate max-w-[120px]"
          >
            Live
          </a>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setShowLogs(!showLogs)}
          className={`p-1 rounded cursor-pointer flex items-center gap-1 px-1.5 ${
            showLogs
              ? "bg-[#333] text-white"
              : "text-[#ccc] hover:bg-[#333] hover:text-white"
          }`}
          title="Toggle Logs"
        >
          <ScrollText className="w-3.5 h-3.5" />
          {showLogs ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-[#ccc] hover:bg-[#333] hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview iframe */}
        <div className="flex-1 min-h-0 relative">
          {busy ? (
            <div className="flex flex-col items-center justify-center h-full w-full bg-[#1e1e1e] gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#007acc]" />
              <p className="text-[13px] text-[#ccc]">
                {isRestarting ? "Restarting..." : "Booting WebContainer..."}
              </p>
            </div>
          ) : previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              title="Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full bg-[#1e1e1e]">
              <p className="text-[13px] text-[#666]">Preview will appear here</p>
            </div>
          )}
        </div>

        {/* Logs panel */}
        {showLogs && (
          <div className="h-[180px] flex-shrink-0 border-t border-[#2b2b2b] bg-[#0c0c14] overflow-y-auto">
            <pre className="p-3 text-[11px] leading-[1.6] text-[#ccc] font-mono whitespace-pre-wrap">
              {logs || "No logs yet..."}
              <div ref={logsEndRef} />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
