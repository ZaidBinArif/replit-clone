import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import type { ProjectFile } from "@/types";

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let currentDevProcess: WebContainerProcess | null = null;

export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1B\][^\x07]*\x07/g, "");
}

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance;
  if (!bootPromise) {
    bootPromise = WebContainer.boot();
  }
  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
}

export async function runCommand(
  cmd: string,
  onLog?: (data: string) => void
): Promise<number> {
  const container = await getWebContainer();
  const parts = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [cmd];
  const binary = parts[0].replace(/"/g, "");
  const args = parts.slice(1).map((a) => a.replace(/"/g, ""));

  onLog?.(`\n$ ${cmd}\n`);
  const process = await container.spawn(binary, args);

  process.output.pipeTo(
    new WritableStream({
      write(data) {
        onLog?.(stripAnsi(data));
      },
    })
  );

  return process.exit;
}

export function filesToFileSystemTree(
  files: Record<string, ProjectFile>
): Record<string, any> {
  const tree: Record<string, any> = {};

  for (const [filePath, file] of Object.entries(files)) {
    const parts = filePath.split("/");
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current[part] = { file: { contents: file.content } };
      } else {
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        current = current[part].directory;
      }
    }
  }

  return tree;
}

function detectDependencies(files: Record<string, ProjectFile>): string[] {
  const deps = new Set<string>();
  const importRegex = /(?:import|require)\s*(?:\(?\s*['"])([^./'"@][^'"]*?)(?:\/[^'"]*)?['"]/g;

  for (const file of Object.values(files)) {
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const pkg = match[1];
      if (!["fs", "path", "os", "url", "http", "https", "crypto", "stream", "util", "events", "child_process", "buffer", "querystring"].includes(pkg)) {
        deps.add(pkg);
      }
    }
  }

  return Array.from(deps);
}

function detectFramework(files: Record<string, ProjectFile>): "react" | "vue" | "angular" | "vanilla" {
  for (const file of Object.values(files)) {
    if (file.content.includes("from 'react'") || file.content.includes('from "react"')) return "react";
    if (file.content.includes("from 'vue'") || file.content.includes('from "vue"')) return "vue";
    if (file.content.includes("@angular/")) return "angular";
  }
  return "react";
}

function generatePackageJson(files: Record<string, ProjectFile>): string {
  const detectedDeps = detectDependencies(files);
  const framework = detectFramework(files);

  const baseDeps: Record<string, string> = {};
  const devDeps: Record<string, string> = {
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.33",
    "autoprefixer": "^10.4.17",
    "typescript": "^5.3.0",
  };

  if (framework === "react") {
    baseDeps["react"] = "^18.2.0";
    baseDeps["react-dom"] = "^18.2.0";
    devDeps["@vitejs/plugin-react"] = "^4.2.0";
    devDeps["@types/react"] = "^18.2.0";
    devDeps["@types/react-dom"] = "^18.2.0";
  } else if (framework === "vue") {
    baseDeps["vue"] = "^3.4.0";
    devDeps["@vitejs/plugin-vue"] = "^5.0.0";
  }

  for (const dep of detectedDeps) {
    if (!baseDeps[dep] && !devDeps[dep]) {
      baseDeps[dep] = "latest";
    }
  }

  return JSON.stringify({
    name: "my-app",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    dependencies: baseDeps,
    devDependencies: devDeps,
  }, null, 2);
}

function ensureEssentialFiles(files: Record<string, ProjectFile>): Record<string, ProjectFile> {
  const enriched = { ...files };
  const framework = detectFramework(files);
  const now = Date.now();

  if (!enriched["package.json"]) {
    console.warn("[WebContainer] No package.json found — auto-generating one");
    enriched["package.json"] = { path: "package.json", content: generatePackageJson(files), language: "json", lastEdited: now };
  }

  if (!enriched["index.html"] && framework !== "angular") {
    const entryScript = enriched["src/main.tsx"] ? "/src/main.tsx"
      : enriched["src/main.ts"] ? "/src/main.ts"
      : enriched["src/main.jsx"] ? "/src/main.jsx"
      : "/src/main.tsx";

    enriched["index.html"] = {
      path: "index.html",
      content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="${entryScript}"></script>\n  </body>\n</html>`,
      language: "html", lastEdited: now,
    };
  }

  if (!enriched["vite.config.ts"] && !enriched["vite.config.js"]) {
    const pluginImport = framework === "react" ? `import react from '@vitejs/plugin-react';\n` : framework === "vue" ? `import vue from '@vitejs/plugin-vue';\n` : "";
    const pluginUse = framework === "react" ? "react()" : framework === "vue" ? "vue()" : "";
    enriched["vite.config.ts"] = {
      path: "vite.config.ts",
      content: `import { defineConfig } from 'vite';\n${pluginImport}\nexport default defineConfig({\n  plugins: [${pluginUse}],\n});`,
      language: "typescript", lastEdited: now,
    };
  }

  if (!enriched["tailwind.config.js"] && !enriched["tailwind.config.ts"]) {
    const usesTailwind = Object.values(enriched).some((f) => f.content.includes("@tailwind") || f.content.includes("tailwindcss"));
    if (usesTailwind) {
      enriched["tailwind.config.js"] = {
        path: "tailwind.config.js",
        content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],\n  theme: { extend: {} },\n  plugins: [],\n};`,
        language: "javascript", lastEdited: now,
      };
    }
  }

  if (!enriched["postcss.config.js"] && !enriched["postcss.config.mjs"] && !enriched["postcss.config.cjs"]) {
    const usesTailwind = Object.values(enriched).some((f) => f.content.includes("@tailwind") || f.content.includes("tailwindcss"));
    if (usesTailwind) {
      enriched["postcss.config.js"] = {
        path: "postcss.config.js",
        content: `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`,
        language: "javascript", lastEdited: now,
      };
    }
  }

  const hasTsx = Object.keys(enriched).some((p) => p.endsWith(".tsx") || p.endsWith(".ts"));
  if (hasTsx) {
    const flatTsConfig = JSON.stringify({
      compilerOptions: { target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"], module: "ESNext", skipLibCheck: true, moduleResolution: "bundler", allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: "react-jsx", strict: true },
      include: ["src"],
    }, null, 2);

    if (!enriched["tsconfig.json"]) {
      enriched["tsconfig.json"] = { path: "tsconfig.json", content: flatTsConfig, language: "json", lastEdited: now };
    } else {
      const tsContent = enriched["tsconfig.json"].content;
      if ((tsContent.includes("tsconfig.node.json") && !enriched["tsconfig.node.json"]) ||
          (tsContent.includes("tsconfig.app.json") && !enriched["tsconfig.app.json"])) {
        enriched["tsconfig.json"] = { path: "tsconfig.json", content: flatTsConfig, language: "json", lastEdited: now };
      }
    }
  }

  return enriched;
}

async function cleanFilesystem(container: WebContainer) {
  try {
    const entries = await container.fs.readdir("/");
    for (const entry of entries) {
      if (entry === "." || entry === "..") continue;
      try { await container.spawn("rm", ["-rf", `/${entry}`]); } catch { /* ignore */ }
    }
  } catch { /* fresh container */ }
}

export async function startProject(
  files: Record<string, ProjectFile>,
  onLog?: (data: string) => void,
  onServerReady?: (url: string) => void
): Promise<{ url: string; process: WebContainerProcess }> {
  const container = await getWebContainer();
  const log = (msg: string) => onLog?.(stripAnsi(msg));

  const enrichedFiles = ensureEssentialFiles(files);
  await cleanFilesystem(container);

  const tree = filesToFileSystemTree(enrichedFiles);
  await container.mount(tree);

  log("📦 Installing dependencies...\n");

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const installProcess = await container.spawn("npm", ["install", "--prefer-offline"]);
    installProcess.output.pipeTo(new WritableStream({ write(data) { log(data); } }));
    const installExitCode = await installProcess.exit;
    if (installExitCode === 0) break;
    if (attempt < maxRetries) {
      log(`\n⚠️ npm install failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...\n`);
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      throw new Error(`npm install failed after ${maxRetries + 1} attempts (exit code ${installExitCode})`);
    }
  }

  log("\n🚀 Starting dev server...\n");

  currentDevProcess = await container.spawn("npm", ["run", "dev"]);
  currentDevProcess.output.pipeTo(new WritableStream({ write(data) { log(data); } }));

  return new Promise((resolve) => {
    container.on("server-ready", (port, url) => {
      log(`\n✅ Server ready at ${url}\n`);
      onServerReady?.(url);
      resolve({ url, process: currentDevProcess! });
    });
  });
}

export async function restartDevServer(
  files: Record<string, ProjectFile>,
  onLog?: (data: string) => void,
  onServerReady?: (url: string) => void
): Promise<void> {
  const container = await getWebContainer();
  const log = (msg: string) => onLog?.(stripAnsi(msg));

  log("\n🔄 Restarting server...\n");

  if (currentDevProcess) {
    try { currentDevProcess.kill(); } catch { /* already dead */ }
    currentDevProcess = null;
  }

  const enrichedFiles = ensureEssentialFiles(files);
  await cleanFilesystem(container);

  const tree = filesToFileSystemTree(enrichedFiles);
  await container.mount(tree);

  log("📦 Reinstalling dependencies...\n");
  const installProcess = await container.spawn("npm", ["install", "--prefer-offline"]);
  installProcess.output.pipeTo(new WritableStream({ write(data) { log(data); } }));
  const installExitCode = await installProcess.exit;
  if (installExitCode !== 0) {
    log(`\n❌ npm install failed (exit code ${installExitCode})\n`);
    return;
  }

  log("\n🚀 Starting dev server...\n");
  currentDevProcess = await container.spawn("npm", ["run", "dev"]);
  currentDevProcess.output.pipeTo(new WritableStream({ write(data) { log(data); } }));

  container.on("server-ready", (port, url) => {
    log(`\n✅ Server ready at ${url}\n`);
    onServerReady?.(url);
  });
}

async function readDirRecursive(
  container: WebContainer,
  dirPath: string,
  basePath: string = ""
): Promise<Record<string, { content: string }>> {
  const result: Record<string, { content: string }> = {};

  let entries: string[];
  try {
    entries = await container.fs.readdir(dirPath);
  } catch {
    return result;
  }

  for (const entry of entries) {
    if (entry === "." || entry === "..") continue;
    const fullPath = dirPath === "/" ? `/${entry}` : `${dirPath}/${entry}`;
    const relPath = basePath ? `${basePath}/${entry}` : entry;

    // Try readdir first — if it succeeds, it's a directory
    let isDir = false;
    try {
      await container.fs.readdir(fullPath);
      isDir = true;
    } catch {
      isDir = false;
    }

    if (isDir) {
      const subFiles = await readDirRecursive(container, fullPath, relPath);
      Object.assign(result, subFiles);
    } else {
      try {
        const content = await container.fs.readFile(fullPath, "utf-8");
        result[relPath] = { content };
      } catch (e) {
        console.warn(`[readDirRecursive] Skipping ${fullPath}:`, e);
      }
    }
  }

  return result;
}

export async function readDistFiles(): Promise<Record<string, { content: string }>> {
  const container = await getWebContainer();

  // List root to see what directories exist
  try {
    const rootEntries = await container.fs.readdir("/");
    console.log("[readDistFiles] Root entries:", rootEntries);
  } catch (e) {
    console.error("[readDistFiles] Failed to list root:", e);
  }

  for (const dir of ["dist", "build"]) {
    try {
      const entries = await container.fs.readdir(`/${dir}`);
      console.log(`[readDistFiles] /${dir} entries:`, entries);
      const files = await readDirRecursive(container, `/${dir}`);
      console.log(`[readDistFiles] /${dir} recursive files:`, Object.keys(files));
      if (Object.keys(files).length > 0) return files;
    } catch (e) {
      console.log(`[readDistFiles] /${dir} not found:`, e);
      continue;
    }
  }

  console.warn("[readDistFiles] No dist/ or build/ directory found");
  return {};
}

export async function updateFileInContainer(
  filePath: string,
  content: string
): Promise<void> {
  const container = await getWebContainer();
  const dir = filePath.split("/").slice(0, -1).join("/");
  if (dir) {
    try { await container.spawn("mkdir", ["-p", dir]); } catch { /* exists */ }
  }
  await container.fs.writeFile(filePath, content);
}

export async function writeFilesToContainer(
  files: Record<string, ProjectFile>
): Promise<void> {
  const container = await getWebContainer();
  for (const [filePath, file] of Object.entries(files)) {
    const dir = filePath.split("/").slice(0, -1).join("/");
    if (dir) {
      try { await container.spawn("mkdir", ["-p", dir]); } catch { /* exists */ }
    }
    await container.fs.writeFile(filePath, file.content);
  }
}

export async function teardownWebContainer(): Promise<void> {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
    bootPromise = null;
    currentDevProcess = null;
  }
}
