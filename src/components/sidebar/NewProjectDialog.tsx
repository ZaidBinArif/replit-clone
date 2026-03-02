"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import type { Framework } from "@/types";
import { X, ArrowRight } from "lucide-react";

const frameworks: { id: Framework; name: string; icon: string; desc: string }[] = [
  { id: "react", name: "React", icon: "⚛️", desc: "Vite + React + Tailwind" },
  { id: "nextjs", name: "Next.js", icon: "▲", desc: "Next.js App Router + Tailwind" },
  { id: "vue", name: "Vue", icon: "💚", desc: "Vite + Vue 3 + Tailwind" },
  { id: "angular", name: "Angular", icon: "🅰️", desc: "Angular 17+ + Tailwind" },
];

interface Props {
  onClose: () => void;
}

export function NewProjectDialog({ onClose }: Props) {
  const [selectedFramework, setSelectedFramework] = useState<Framework>("react");
  const [prompt, setPrompt] = useState("");
  const createProject = useProjectStore((s) => s.createProject);
  const addMessage = useProjectStore((s) => s.addMessage);

  const handleCreate = () => {
    if (!prompt.trim()) return;
    const project = createProject(prompt.trim().slice(0, 50), selectedFramework);
    // Add the initial user message
    addMessage(project.id, {
      role: "user",
      content: prompt.trim(),
      timestamp: Date.now(),
    });
    onClose();
    // AI will pick up from here via the chat component
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden animate-slide-up bg-zinc-900 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-zinc-100">
            New Project
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Framework selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3 text-zinc-500">
              Framework
            </label>
            <div className="grid grid-cols-2 gap-2">
              {frameworks.map((fw) => {
                const isSelected = selectedFramework === fw.id;
                return (
                  <button
                    key={fw.id}
                    onClick={() => setSelectedFramework(fw.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-blue-500/10 border border-blue-500/30"
                        : "bg-zinc-800/50 border border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span className="text-xl">{fw.icon}</span>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isSelected ? "text-blue-400" : "text-zinc-200"
                        }`}
                      >
                        {fw.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {fw.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3 text-zinc-500">
              What do you want to build?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A task management app with drag and drop, categories, and due dates..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all duration-200 placeholder:opacity-40 bg-zinc-950 border border-white/10 text-zinc-100 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleCreate();
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-zinc-900/50">
          <span className="text-xs text-zinc-500">
            Ctrl+Enter to start
          </span>
          <button
            onClick={handleCreate}
            disabled={!prompt.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-blue-600 text-white hover:bg-blue-500 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)]"
          >
            Start Building
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
