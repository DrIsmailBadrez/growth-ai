"use client";

import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import { ToolResultCard } from "./tool-result-card";
import { getToolDisplay } from "./tool-display-config";
import { ToolIcon } from "./tool-icon";
import { SourcesBar, type Source } from "./sources-bar";
import { ImageLightbox } from "./image-lightbox";
import { parseSuggestions } from "@/lib/parse-suggestions";
import { CampaignBuildTracker, CREATION_TOOL_NAMES } from "./campaign-build-tracker";

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function collectSources(parts: UIMessage["parts"]): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (!part.type.startsWith("tool-")) continue;
    const tp = part as { type: string; state: string; output?: unknown };
    if (tp.state !== "output-available" || !tp.output) continue;
    const result = tp.output as Record<string, unknown>;
    if (result.type === "web_search_results") {
      const results = result.results as Array<{ title?: string; url?: string; snippet?: string }>;
      for (const r of results ?? []) {
        if (r.url && !seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ title: r.title || getDomain(r.url), url: r.url, domain: getDomain(r.url), snippet: r.snippet });
        }
      }
    }
    if (result.type === "webpage_content") {
      const url = result.url as string | undefined;
      if (url && !seen.has(url)) {
        seen.add(url);
        sources.push({ title: (result.title as string) || getDomain(url), url, domain: getDomain(url), snippet: (result.content as string)?.slice(0, 200) });
      }
    }
  }
  return sources;
}

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = isUser ? [] : collectSources(message.parts);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[68%] rounded-2xl rounded-br-sm bg-foreground px-4 py-3 text-sm leading-relaxed text-background">
          {message.parts.map((part, i) => {
            if (part.type === "text" && part.text) {
              return <div key={i} className="whitespace-pre-wrap">{part.text}</div>;
            }
            if (part.type === "file") {
              const fp = part as { type: "file"; mediaType: string; url: string; filename?: string };
              if (fp.mediaType.startsWith("image/")) {
                return <img key={i} src={fp.url} alt={fp.filename ?? "Uploaded image"} className="mt-2 max-w-full rounded-lg" />;
              }
              const ext = fp.filename?.split(".").pop()?.toUpperCase() ?? fp.mediaType.split("/").pop()?.toUpperCase();
              return (
                <div key={i} className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/10 font-mono text-[10px]">{ext}</span>
                  <span className="truncate opacity-80">{fp.filename ?? "Uploaded file"}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  // AI message — full-width card, left edge aligns with input bar
  return (
    <div className="card rounded-2xl px-5 py-4 space-y-3">
      {message.parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            const { cleaned } = parseSuggestions(part.text);
            if (!cleaned) return null;
            return <Markdown key={i} streaming={isStreaming}>{cleaned}</Markdown>;
          }

          if (part.type === "file") {
            const fp = part as { type: "file"; mediaType: string; url: string; filename?: string };
            if (fp.mediaType.startsWith("image/")) {
              return <img key={i} src={fp.url} alt={fp.filename ?? "Uploaded image"} className="max-w-full rounded-lg" />;
            }
            const ext = fp.filename?.split(".").pop()?.toUpperCase() ?? fp.mediaType.split("/").pop()?.toUpperCase();
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-hover font-mono text-[10px] text-foreground-muted">{ext}</span>
                <span className="truncate text-foreground-secondary">{fp.filename ?? "Uploaded file"}</span>
              </div>
            );
          }

          if (part.type.startsWith("tool-")) {
            const toolName = part.type.replace("tool-", "");

            // Creation steps are rendered together via CampaignBuildTracker below
            if (CREATION_TOOL_NAMES.has(toolName as never)) return null;

            const tp = part as { type: string; toolCallId: string; state: string; input?: unknown; output?: unknown; errorText?: string };
            const display = getToolDisplay(toolName);

            if (tp.state === "input-streaming" || tp.state === "input-available") {
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground-muted">
                  <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-foreground-muted opacity-15" />
                    <ToolIcon path={display.iconPath} className={`h-3 w-3 ${display.iconColor} animate-pulse`} />
                  </span>
                  <span>{display.loadingText}...</span>
                </div>
              );
            }

            if (tp.state === "output-available") {
              const result = tp.output as Record<string, unknown> | null;
              if (!result) return null;

              if (toolName === "generateAdImage" && result.type === "generated_image" && typeof result.url === "string") {
                return (
                  <ImageLightbox
                    key={i}
                    src={result.url}
                    alt="AI-generated ad image"
                    caption={typeof result.revisedPrompt === "string" ? result.revisedPrompt : undefined}
                  />
                );
              }

              if (result.type === "web_search_results" || result.type === "webpage_content") {
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground-muted">
                    <ToolIcon path={display.iconPath} className={`h-3 w-3 shrink-0 ${display.iconColor}`} />
                    <span>{display.label}</span>
                    <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                );
              }

              return <ToolResultCard key={i} toolName={toolName} result={result} />;
            }

            if (tp.state === "output-error") {
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-xs text-error">
                  <ToolIcon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" className="h-3.5 w-3.5 shrink-0" />
                  <span>{display.label} failed{tp.errorText ? `: ${tp.errorText}` : ""}</span>
                </div>
              );
            }

            if (tp.state === "output-denied") {
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground-muted italic">
                  <ToolIcon path="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" className="h-3.5 w-3.5 shrink-0" />
                  <span>{display.label} was cancelled</span>
                </div>
              );
            }
          }

          return null;
        })}

        {/* Campaign creation progress tracker */}
        <CampaignBuildTracker parts={message.parts} />

        {sources.length > 0 && <SourcesBar sources={sources} />}
    </div>
  );
}
