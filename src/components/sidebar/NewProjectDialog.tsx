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
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "var(--color-bg-overlay)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-default)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-border-default)" }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            New Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors duration-150 cursor-pointer"
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
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Framework selection */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              Framework
            </label>
            <div className="grid grid-cols-2 gap-2">
              {frameworks.map((fw) => {
                const isSelected = selectedFramework === fw.id;
                return (
                  <button
                    key={fw.id}
                    onClick={() => setSelectedFramework(fw.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 cursor-pointer"
                    style={{
                      background: isSelected
                        ? "var(--color-accent-subtle)"
                        : "var(--color-bg-elevated)",
                      border: isSelected
                        ? "1px solid var(--color-accent-muted)"
                        : "1px solid var(--color-border-default)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--color-border-active)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--color-border-default)";
                      }
                    }}
                  >
                    <span className="text-xl">{fw.icon}</span>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-text-primary)",
                        }}
                      >
                        {fw.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
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
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              What do you want to build?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A task management app with drag and drop, categories, and due dates..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all duration-200 placeholder:opacity-40"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent-muted)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
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
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: "1px solid var(--color-border-default)" }}
        >
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Ctrl+Enter to start
          </span>
          <button
            onClick={handleCreate}
            disabled={!prompt.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
            }}
            onMouseEnter={(e) => {
              if (prompt.trim()) {
                e.currentTarget.style.background = "var(--color-accent-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 16px var(--color-accent-glow)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-accent)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Start Building
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
