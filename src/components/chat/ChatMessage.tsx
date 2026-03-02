"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectStore } from "@/stores/project-store";
import { User, Bot, FileCode2, Check, Terminal } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const user = useProjectStore((s) => s.user);
  const openFile = useProjectStore((s) => s.openFile);
  const isUser = message.role === "user";

  // Parse content: extract file operations and shell commands, clean text
  const { textContent, fileOps, shellOps } = useMemo(() => {
    if (isUser) return { textContent: message.content, fileOps: [], shellOps: [] };

    const files: string[] = [];
    const shells: string[] = [];
    let text = message.content;

    // Extract file paths
    const fileMatches = text.matchAll(
      /<boltAction\s+type="file"\s+filePath="([^"]+)">/g
    );
    for (const match of fileMatches) {
      files.push(match[1]);
    }

    // Extract shell commands
    const shellMatches = text.matchAll(
      /<boltAction\s+type="shell"\s+command="([^"]+)"\s*\/>/g
    );
    for (const match of shellMatches) {
      shells.push(match[1]);
    }

    // Remove artifact blocks for display
    text = text.replace(/<boltArtifact[^>]*>/g, "");
    text = text.replace(/<\/boltArtifact>/g, "");
    text = text.replace(/<boltAction\s+type="file"\s+filePath="[^"]+">[\s\S]*?<\/boltAction>/g, "");
    text = text.replace(/<boltAction\s+type="shell"\s+command="[^"]+"\s*\/>/g, "");
    text = text.trim();

    if (!text && files.length > 0) {
      text = "I've set up the project files:";
    }

    return { textContent: text, fileOps: files, shellOps: shells };
  }, [message.content, isUser]);

  return (
    <div
      className="px-4 py-4 animate-slide-up"
      style={{
        background: isUser ? "transparent" : "var(--color-bg-surface)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex gap-3 max-w-full">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-6 h-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-bg-elevated)" }}
              >
                <User className="w-3.5 h-3.5" style={{ color: "var(--color-text-secondary)" }} />
              </div>
            )
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: "var(--color-accent-subtle)",
                border: "1px solid var(--color-accent-muted)",
              }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p
            className="text-xs font-medium mb-1.5"
            style={{
              color: isUser ? "var(--color-text-secondary)" : "var(--color-accent)",
            }}
          >
            {isUser ? "You" : "CodeStudio AI"}
          </p>

          {/* Message text with markdown */}
          <div className="prose-chat text-sm leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0" style={{ color: "var(--color-text-primary)" }}>
                    {children}
                  </p>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded text-[13px]"
                        style={{
                          background: "var(--color-bg-elevated)",
                          color: "var(--color-accent)",
                          fontFamily: "var(--font-mono)",
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="block p-3 rounded-lg my-2 text-[13px] overflow-x-auto"
                      style={{
                        background: "var(--color-bg-elevated)",
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-mono)",
                        border: "1px solid var(--color-border-default)",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 space-y-1" style={{ color: "var(--color-text-primary)" }}>
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1" style={{ color: "var(--color-text-primary)" }}>
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ color: "var(--color-text-primary)" }}>{children}</li>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: "var(--color-text-secondary)" }}>{children}</em>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--color-accent)", textDecoration: "underline" }}
                  >
                    {children}
                  </a>
                ),
                h1: ({ children }) => (
                  <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: "var(--color-text-primary)" }}>{children}</h3>
                ),
                h2: ({ children }) => (
                  <h4 className="text-sm font-semibold mb-1.5 mt-2" style={{ color: "var(--color-text-primary)" }}>{children}</h4>
                ),
                h3: ({ children }) => (
                  <h5 className="text-sm font-medium mb-1 mt-2" style={{ color: "var(--color-text-primary)" }}>{children}</h5>
                ),
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>

          {/* File operation chips */}
          {fileOps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {fileOps.map((filePath, i) => (
                <button
                  key={`${filePath}-${i}`}
                  onClick={() => openFile(filePath)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-150 cursor-pointer"
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent-muted)";
                    e.currentTarget.style.color = "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-default)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  <Check className="w-3 h-3" style={{ color: "var(--color-success)" }} />
                  <FileCode2 className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{filePath}</span>
                </button>
              ))}
            </div>
          )}

          {/* Shell command chips */}
          {shellOps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {shellOps.map((cmd, i) => (
                <div
                  key={`shell-${i}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono"
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <Terminal className="w-3 h-3" />
                  <span className="truncate max-w-[250px]">{cmd}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
