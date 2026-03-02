import type { Project, ChatMessage } from "@/types";
import { createCompressedMessage } from "./context-manager";

// ============================================
// Async Summarization Engine
// ============================================
// Runs after each AI response to maintain the 3-tier chat history.
// - Tier C → Tier B: Compress old full messages
// - Tier B → Tier A: Summarize oldest compressed messages into rolling summary

const TIER_C_SIZE = 10;
const TIER_B_MAX_SIZE = 20;
const GEMINI_API_KEY = typeof process !== "undefined" ? process.env?.GEMINI_API_KEY || "" : "";

/**
 * Run after each AI response to maintain context tiers.
 * This is designed to run asynchronously (non-blocking).
 */
export async function runSummarization(
  project: Project,
  updateProject: (updates: Partial<Project>) => void
): Promise<void> {
  const messages = project.messages;
  const total = messages.length;
  const contextState = { ...project.contextState };

  if (total <= TIER_C_SIZE) {
    // Not enough messages to need compression
    return;
  }

  let changed = false;

  // Step 1: Compress messages from Tier C overflow → Tier B
  const tierCStart = Math.max(0, total - TIER_C_SIZE);

  for (let i = contextState.tierB_startFrom; i < tierCStart; i++) {
    const msg = messages[i];
    if (!msg.compressed) {
      // Generate compressed version (local, no API call needed)
      const compressed = createCompressedMessage(msg);
      messages[i] = { ...msg, compressed };
      changed = true;
    }
  }

  // Step 2: If Tier B is getting too large, roll oldest into Tier A summary
  const tierBMessages = messages.slice(
    contextState.tierA_coversUpTo + 1,
    tierCStart
  );

  if (tierBMessages.length > TIER_B_MAX_SIZE) {
    // Take the oldest half of Tier B and summarize into Tier A
    const toSummarize = tierBMessages.slice(0, Math.floor(tierBMessages.length / 2));

    // Build text to summarize
    const summaryInput = toSummarize
      .map((m) => m.compressed || m.content.slice(0, 200))
      .join("\n");

    // Try to use AI for summarization, fall back to simple extraction
    let newSummary: string;
    if (GEMINI_API_KEY) {
      newSummary = await aiSummarize(
        contextState.tierA_summary,
        summaryInput
      );
    } else {
      newSummary = localSummarize(contextState.tierA_summary, summaryInput);
    }

    contextState.tierA_summary = newSummary;
    contextState.tierA_coversUpTo =
      contextState.tierA_coversUpTo + toSummarize.length;
    contextState.tierB_startFrom =
      contextState.tierA_coversUpTo + 1;
    changed = true;
  }

  if (changed) {
    updateProject({
      messages: [...messages],
      contextState,
    });
  }
}

/**
 * Use Gemini to create a summary (called when API key is available)
 */
async function aiSummarize(
  existingSummary: string,
  newContent: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a conversation summarizer. Create a concise summary that combines the existing summary with new conversation content.

EXISTING SUMMARY:
${existingSummary || "(none)"}

NEW CONVERSATION CONTENT:
${newContent}

Create a single paragraph summary (max 200 words) that captures:
- What features/components were built
- Key decisions and user preferences
- Bugs fixed or issues resolved
- Current state of the project

Return ONLY the summary paragraph, nothing else.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Summarization API failed");
    }

    const data = await response.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      localSummarize(existingSummary, newContent)
    );
  } catch {
    return localSummarize(existingSummary, newContent);
  }
}

/**
 * Simple local summarization (no API call)
 */
function localSummarize(
  existingSummary: string,
  newContent: string
): string {
  // Extract key info from compressed messages
  const lines = newContent.split("\n").filter((l) => l.trim());
  const keyPoints = lines
    .map((l) => {
      // Extract the gist of each compressed message
      const match = l.match(/(?:User asked|AI responded): (.+)/);
      return match ? match[1].slice(0, 80) : l.slice(0, 80);
    })
    .slice(0, 10);

  const combined = existingSummary
    ? `${existingSummary} Additionally: ${keyPoints.join(". ")}.`
    : keyPoints.join(". ") + ".";

  // Keep summary under ~500 characters
  return combined.length > 500 ? combined.slice(0, 497) + "..." : combined;
}

/**
 * Generate a file summary using AI or simple extraction
 */
export async function generateFileSummary(
  filePath: string,
  content: string
): Promise<string> {
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Summarize this source file in 2 sentences. Focus on: what it exports, its purpose, and key functions/components.

FILE: ${filePath}
\`\`\`
${content.slice(0, 3000)}
\`\`\`

Return ONLY the 2-sentence summary.`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || extractSimpleSummary(filePath, content);
      }
    } catch {
      // Fall through to local extraction
    }
  }

  return extractSimpleSummary(filePath, content);
}

/**
 * Extract a simple summary from code without AI
 */
function extractSimpleSummary(filePath: string, content: string): string {
  const exports: string[] = [];
  const functions: string[] = [];
  const components: string[] = [];

  // Extract export names
  const exportMatches = content.matchAll(
    /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g
  );
  for (const m of exportMatches) {
    exports.push(m[1]);
  }

  // Extract function names
  const funcMatches = content.matchAll(
    /(?:function|const)\s+(\w+)\s*(?:=\s*(?:\([^)]*\)\s*=>|\([^)]*\)\s*:\s*\w+\s*=>)|\()/g
  );
  for (const m of funcMatches) {
    functions.push(m[1]);
  }

  const ext = filePath.split(".").pop();
  const isComponent = ext === "tsx" || ext === "jsx" || ext === "vue";

  if (isComponent && exports.length > 0) {
    return `${filePath}: ${isComponent ? "Component" : "Module"} that exports ${exports.join(", ")}. Contains ${functions.length} functions.`;
  }

  return `${filePath}: Contains ${exports.length} exports and ${functions.length} functions.`;
}
