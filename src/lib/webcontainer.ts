import { WebContainer } from "@webcontainer/api";
import type { ProjectFile } from "@/types";

// ============================================
// WebContainer Manager
// ============================================

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

function stripAnsi(str: string): string {
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

/**
 * Convert flat file map to WebContainer file system tree
 */
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
        current[part] = {
          file: {
            contents: file.content,
          },
        };
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

// ============================================
// Safety Net: Auto-inject missing essential files
// ============================================

/**
 * Detect what imports/packages are used in the source files
 */
function detectDependencies(files: Record<string, ProjectFile>): string[] {
  const deps = new Set<string>();
  const importRegex = /(?:import|require)\s*(?:\(?\s*['"])([^./'"@][^'"]*?)(?:\/[^'"]*)?['"]/g;

  for (const file of Object.values(files)) {
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const pkg = match[1];
      // Skip node built-ins
      if (!["fs", "path", "os", "url", "http", "https", "crypto", "stream", "util", "events", "child_process", "buffer", "querystring"].includes(pkg)) {
        deps.add(pkg);
      }
    }
  }

  return Array.from(deps);
}

/**
 * Detect what framework the project uses based on file content
 */
function detectFramework(files: Record<string, ProjectFile>): "react" | "vue" | "angular" | "vanilla" {
  for (const file of Object.values(files)) {
    if (file.content.includes("from 'react'") || file.content.includes('from "react"')) return "react";
    if (file.content.includes("from 'vue'") || file.content.includes('from "vue"')) return "vue";
    if (file.content.includes("@angular/")) return "angular";
  }
  return "react"; // default
}

/**
 * Generate a package.json based on detected dependencies
 */
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

  // Add detected deps to baseDeps
  for (const dep of detectedDeps) {
    if (!baseDeps[dep] && !devDeps[dep]) {
      baseDeps[dep] = "latest";
    }
  }

  const pkg = {
    name: "my-app",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: baseDeps,
    devDependencies: devDeps,
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Generate essential config files if missing
 */
function ensureEssentialFiles(files: Record<string, ProjectFile>): Record<string, ProjectFile> {
  const enriched = { ...files };
  const framework = detectFramework(files);

  const now = Date.now();

  // 1. package.json
  if (!enriched["package.json"]) {
    console.warn("[WebContainer] No package.json found — auto-generating one");
    enriched["package.json"] = {
      path: "package.json",
      content: generatePackageJson(files),
      language: "json",
      lastEdited: now,
    };
  }

  // 2. index.html (for Vite-based projects)
  if (!enriched["index.html"] && framework !== "angular") {
    const entryScript = enriched["src/main.tsx"] ? "/src/main.tsx"
      : enriched["src/main.ts"] ? "/src/main.ts"
      : enriched["src/main.jsx"] ? "/src/main.jsx"
      : "/src/main.tsx";

    enriched["index.html"] = {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entryScript}"></script>
  </body>
</html>`,
      language: "html",
      lastEdited: now,
    };
  }

  // 3. vite.config.ts
  if (!enriched["vite.config.ts"] && !enriched["vite.config.js"]) {
    const pluginImport = framework === "react"
      ? `import react from '@vitejs/plugin-react';\n`
      : framework === "vue"
      ? `import vue from '@vitejs/plugin-vue';\n`
      : "";
    const pluginUse = framework === "react"
      ? "react()"
      : framework === "vue"
      ? "vue()"
      : "";

    enriched["vite.config.ts"] = {
      path: "vite.config.ts",
      content: `import { defineConfig } from 'vite';
${pluginImport}
export default defineConfig({
  plugins: [${pluginUse}],
});`,
      language: "typescript",
      lastEdited: now,
    };
  }

  // 4. tailwind.config.js
  if (!enriched["tailwind.config.js"] && !enriched["tailwind.config.ts"]) {
    // Only add if any CSS file uses @tailwind
    const usesTailwind = Object.values(enriched).some(
      (f) => f.content.includes("@tailwind") || f.content.includes("tailwindcss")
    );
    if (usesTailwind) {
      enriched["tailwind.config.js"] = {
        path: "tailwind.config.js",
        content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,
        language: "javascript",
        lastEdited: now,
      };
    }
  }

  // 5. postcss.config.js
  if (
    !enriched["postcss.config.js"] &&
    !enriched["postcss.config.mjs"] &&
    !enriched["postcss.config.cjs"]
  ) {
    const usesTailwind = Object.values(enriched).some(
      (f) => f.content.includes("@tailwind") || f.content.includes("tailwindcss")
    );
    if (usesTailwind) {
      enriched["postcss.config.js"] = {
        path: "postcss.config.js",
        content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,
        language: "javascript",
        lastEdited: now,
      };
    }
  }

  // 6. tsconfig.json — fix or create
  const hasTsx = Object.keys(enriched).some((p) => p.endsWith(".tsx") || p.endsWith(".ts"));
  if (hasTsx) {
    const flatTsConfig = JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
      },
      include: ["src"],
    }, null, 2);

    if (!enriched["tsconfig.json"]) {
      enriched["tsconfig.json"] = {
        path: "tsconfig.json",
        content: flatTsConfig,
        language: "json",
        lastEdited: now,
      };
    } else {
      // If tsconfig.json references tsconfig.node.json or tsconfig.app.json
      // that don't exist, replace it with a flat self-contained version
      const tsContent = enriched["tsconfig.json"].content;
      const refsNodeJson = tsContent.includes("tsconfig.node.json") && !enriched["tsconfig.node.json"];
      const refsAppJson = tsContent.includes("tsconfig.app.json") && !enriched["tsconfig.app.json"];
      if (refsNodeJson || refsAppJson) {
        console.warn("[WebContainer] tsconfig.json has broken references — replacing with flat config");
        enriched["tsconfig.json"] = {
          path: "tsconfig.json",
          content: flatTsConfig,
          language: "json",
          lastEdited: now,
        };
      }
    }
  }

  return enriched;
}

/**
 * Mount files, install dependencies, and start dev server.
 * Returns the preview URL.
 */
export async function startProject(
  files: Record<string, ProjectFile>,
  onLog?: (data: string) => void,
  onServerReady?: (url: string) => void
): Promise<{ url: string; process: any }> {
  const container = await getWebContainer();
  const log = (msg: string) => onLog?.(stripAnsi(msg));

  const enrichedFiles = ensureEssentialFiles(files);

  // Clean up stale files from any previous project before mounting
  try {
    const entries = await container.fs.readdir("/");
    for (const entry of entries) {
      if (entry === "." || entry === "..") continue;
      try {
        await container.spawn("rm", ["-rf", `/${entry}`]);
      } catch { /* ignore */ }
    }
  } catch { /* fresh container, nothing to clean */ }

  const tree = filesToFileSystemTree(enrichedFiles);
  await container.mount(tree);

  log("📦 Installing dependencies...\n");

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const installProcess = await container.spawn("npm", ["install", "--prefer-offline"]);

    installProcess.output.pipeTo(
      new WritableStream({ write(data) { log(data); } })
    );

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

  const devProcess = await container.spawn("npm", ["run", "dev"]);

  devProcess.output.pipeTo(
    new WritableStream({ write(data) { log(data); } })
  );

  return new Promise((resolve) => {
    container.on("server-ready", (port, url) => {
      log(`\n✅ Server ready at ${url}\n`);
      onServerReady?.(url);
      resolve({ url, process: devProcess });
    });
  });
}

/**
 * Update a single file in the running WebContainer
 */
export async function updateFileInContainer(
  filePath: string,
  content: string
): Promise<void> {
  const container = await getWebContainer();
  
  // Ensure directory exists
  const dir = filePath.split("/").slice(0, -1).join("/");
  if (dir) {
    await container.spawn("mkdir", ["-p", dir]);
  }

  await container.fs.writeFile(filePath, content);
}

/**
 * Write multiple files to the running WebContainer
 */
export async function writeFilesToContainer(
  files: Record<string, ProjectFile>
): Promise<void> {
  const container = await getWebContainer();

  for (const [filePath, file] of Object.entries(files)) {
    const dir = filePath.split("/").slice(0, -1).join("/");
    if (dir) {
      try {
        await container.spawn("mkdir", ["-p", dir]);
      } catch {
        // Directory might already exist
      }
    }
    await container.fs.writeFile(filePath, file.content);
  }
}

/**
 * Tear down the WebContainer
 */
export async function teardownWebContainer(): Promise<void> {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
    bootPromise = null;
  }
}
