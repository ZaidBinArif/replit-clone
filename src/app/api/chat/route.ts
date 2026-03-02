import { NextRequest } from "next/server";
import { buildContext } from "@/lib/context-manager";
import type { Project } from "@/types";

// ============================================
// Gemini 2.0 Flash API Integration
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, message, project } = body as {
      projectId: string;
      message: string;
      project: Project;
    };

    if (!message || !project) {
      return new Response("Missing message or project data", { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      // Stream mock response character by character for realistic effect
      const mockContent = createMockStreamResponse(message, project);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const chunkSize = 20; // characters per chunk
          for (let i = 0; i < mockContent.length; i += chunkSize) {
            const chunk = mockContent.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise((r) => setTimeout(r, 5)); // 5ms delay per chunk
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Build context using our 4-layer system
    const contextMessages = buildContext({
      project,
      activeFilePath: null, // TODO: pass from client
      newUserMessage: message,
    });

    // Convert to Gemini format
    const geminiContents = contextMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    // Add system instruction
    const systemInstruction = contextMessages.find(
      (m) => m.role === "system"
    );

    // Call Gemini API with streaming
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}&alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      // Fall back to mock response instead of failing
      console.warn("Falling back to mock AI response");
      const mockContent = createMockStreamResponse(message, project);
      const encoder = new TextEncoder();
      const fallbackStream = new ReadableStream({
        async start(controller) {
          const chunkSize = 20;
          for (let i = 0; i < mockContent.length; i += chunkSize) {
            const chunk = mockContent.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise((r) => setTimeout(r, 5));
          }
          controller.close();
        },
      });
      return new Response(fallbackStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      return new Response("No response stream", { status: 502 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // Parse SSE events
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const text =
                    parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                } catch {
                  // Skip unparseable chunks
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// ============================================
// Mock Response (when no API key is set)
// ============================================

function createMockStreamResponse(message: string, project: Project): string {
  const framework = project.framework;
  const isFirstMessage = project.messages.length <= 1;

  if (isFirstMessage) {
    // Generate initial scaffold based on framework
    return generateInitialScaffold(message, framework);
  }

  // For subsequent messages, generate a contextual response
  return `I'll help you with that! Let me update the code.

<boltArtifact id="update" title="Code Update">
<boltAction type="file" filePath="src/App.${framework === "vue" ? "vue" : "tsx"}">
// Updated based on your request: "${message}"
// This is a mock response - connect your Gemini API key for real AI responses
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Updated App
        </h1>
        <p className="text-gray-600">
          Connect your Gemini API key to get real AI-powered code generation.
        </p>
      </div>
    </div>
  );
}
</boltAction>
</boltArtifact>

Set your \`GEMINI_API_KEY\` environment variable to enable real AI responses!`;
}

function generateInitialScaffold(prompt: string, framework: string): string {
  const scaffolds: Record<string, string> = {
    react: `I'll create a React application for you! Let me set up the project.

<boltArtifact id="initial-setup" title="React Project Setup">
<boltAction type="file" filePath="package.json">
{
  "name": "my-react-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
</boltAction>
<boltAction type="file" filePath="index.html">
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</boltAction>
<boltAction type="file" filePath="src/main.tsx">
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
</boltAction>
<boltAction type="file" filePath="src/index.css">
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
</boltAction>
<boltAction type="file" filePath="src/App.tsx">
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-6">
            <Sparkles className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Welcome to Your App
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Built with React + Tailwind CSS. Start editing to see changes.
          </p>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-200"
          >
            Count: {count}
          </button>
        </div>
      </div>
    </div>
  );
}
</boltAction>
<boltAction type="file" filePath="tailwind.config.js">
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
</boltAction>
<boltAction type="file" filePath="vite.config.ts">
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
</boltAction>
<boltAction type="file" filePath="postcss.config.js">
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
</boltAction>
<boltAction type="file" filePath="tsconfig.json">
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
</boltAction>
</boltArtifact>

I've scaffolded a React + Vite + Tailwind project based on your request: "${prompt}". The app includes:

- ⚡ Vite for fast development
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 📦 Lucide icons

You can now ask me to modify the app, add features, or change the design!`,

    nextjs: `I'll create a Next.js application for you!

<boltArtifact id="initial-setup" title="Next.js Project Setup">
<boltAction type="file" filePath="src/app/page.tsx">
import { Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8">
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-6">
          <Sparkles className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
          Welcome to Your App
        </h1>
        <p className="text-lg text-gray-500">
          Built with Next.js + Tailwind CSS
        </p>
      </div>
    </main>
  );
}
</boltAction>
<boltAction type="file" filePath="src/app/layout.tsx">
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My App',
  description: 'Built with CodeStudio AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
</boltAction>
<boltAction type="file" filePath="src/app/globals.css">
@tailwind base;
@tailwind components;
@tailwind utilities;
</boltAction>
</boltArtifact>

I've created a Next.js project based on: "${prompt}". Ask me to add features!`,

    vue: `I'll create a Vue 3 application for you!

<boltArtifact id="initial-setup" title="Vue Project Setup">
<boltAction type="file" filePath="src/App.vue">
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8">
    <div class="max-w-4xl mx-auto text-center py-16">
      <h1 class="text-4xl font-bold text-gray-900 tracking-tight mb-3">
        Welcome to Your Vue App
      </h1>
      <p class="text-lg text-gray-500 mb-8">
        Built with Vue 3 + Tailwind CSS
      </p>
      <button
        @click="count++"
        class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all"
      >
        Count: {{ count }}
      </button>
    </div>
  </div>
</template>
</boltAction>
<boltAction type="file" filePath="src/main.ts">
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).mount('#app');
</boltAction>
<boltAction type="file" filePath="src/style.css">
@tailwind base;
@tailwind components;
@tailwind utilities;
</boltAction>
</boltArtifact>

Vue 3 project created based on: "${prompt}". What would you like to add?`,

    angular: `I'll create an Angular application for you!

<boltArtifact id="initial-setup" title="Angular Project Setup">
<boltAction type="file" filePath="src/app/app.component.ts">
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8">
      <div class="max-w-4xl mx-auto text-center py-16">
        <h1 class="text-4xl font-bold text-gray-900 tracking-tight mb-3">
          Welcome to Your Angular App
        </h1>
        <p class="text-lg text-gray-500 mb-8">
          Built with Angular 17+ Tailwind CSS
        </p>
        <button
          (click)="count = count + 1"
          class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all"
        >
          Count: {{ count }}
        </button>
      </div>
    </div>
  \`,
})
export class AppComponent {
  count = 0;
}
</boltAction>
</boltArtifact>

Angular project created based on: "${prompt}". What would you like to build?`,
  };

  return scaffolds[framework] || scaffolds.react;
}
