"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectStore } from "@/stores/project-store";
import { User, Sparkles, Check, Terminal } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const user = useProjectStore((s) => s.user);
  const openFile = useProjectStore((s) => s.openFile);
  const isUser = message.role === "user";

  const { textContent, fileOps, shellOps } = useMemo(() => {
    if (isUser) return { textContent: message.content, fileOps: [], shellOps: [] };

    const files: string[] = [];
    const shells: string[] = [];
    let text = message.content;

    const fileMatches = text.matchAll(
      /<boltAction\s+type="file"\s+filePath="([^"]+)">/g
    );
    for (const match of fileMatches) {
      files.push(match[1]);
    }

    const shellMatches = text.matchAll(
      /<boltAction\s+type="shell"\s+command="([^"]+)"\s*\/>/g
    );
    for (const match of shellMatches) {
      shells.push(match[1]);
    }

    text = text.replace(/<boltArtifact[^>]*>/g, "");
    text = text.replace(/<\/boltArtifact>/g, "");
    text = text.replace(/<boltAction\s+type="file"\s+filePath="[^"]+">[\s\S]*?<\/boltAction>/g, "");
    text = text.replace(/<boltAction\s+type="shell"\s+command="[^"]+"\s*\/>/g, "");
    text = text.trim();

    if (!text && files.length > 0) {
      text = "I've updated the project files.";
    }

    return { textContent: text, fileOps: files, shellOps: shells };
  }, [message.content, isUser]);

  return (
    <div className={`px-5 py-3 ${isUser ? "" : "bg-white/[0.02]"}`}>
      <div className="flex gap-3 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-indigo-600 text-white">
                <User className="w-3.5 h-3.5" />
              </div>
            )
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-indigo-500/15">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden pt-0.5">
          <span className="text-[12px] font-semibold text-zinc-400 mb-1 block">
            {isUser ? (user?.displayName || "You") : "AI Copilot"}
          </span>
          <div className="prose-chat text-[13px] leading-[1.65] break-words text-zinc-300 font-sans">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-indigo-300 font-mono text-[12px]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="block p-3 rounded-lg my-2 text-[12px] bg-[#0a0a12] border border-white/[0.06] text-zinc-300 font-mono overflow-x-auto"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                ul: ({ children }) => (
                  <ul className="list-disc list-outside mb-2 space-y-1 ml-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside mb-2 space-y-1 ml-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>

          {/* File operation chips */}
          {fileOps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {fileOps.map((filePath, i) => (
                <button
                  key={`${filePath}-${i}`}
                  onClick={() => openFile(filePath)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3 text-emerald-400" strokeWidth={2.5} />
                  <span className="text-[11px] font-mono text-emerald-300 truncate max-w-[200px]">{filePath}</span>
                </button>
              ))}
            </div>
          )}

          {/* Shell command chips */}
          {shellOps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {shellOps.map((cmd, i) => (
                <div
                  key={`shell-${i}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                >
                  <Terminal className="w-3 h-3 text-zinc-400" strokeWidth={2} />
                  <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[200px]">{cmd}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
