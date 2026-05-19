"use client";

import type { UIMessage } from "ai";
import { Markdown } from "./markdown";
import { ToolResultCard } from "./tool-result-card";
import { getToolDisplay } from "./tool-display-config";
import { ToolIcon } from "./tool-icon";
import { SourcesBar, type Source } from "./sources-bar";
import { ImageLightbox } from "./image-lightbox";
import { parseSuggestions } from "@/lib/parse-suggestions";

/** Extract a clean domain from a URL string */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Collect sources from all tool result parts in a message */
function collectSources(parts: UIMessage["parts"]): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (!part.type.startsWith("tool-")) continue;

    const toolPart = part as {
      type: string;
      state: string;
      output?: unknown;
    };
    if (toolPart.state !== "output-available" || !toolPart.output) continue;

    const result = toolPart.output as Record<string, unknown>;

    // Web search results → each result is a source
    if (result.type === "web_search_results") {
      const results = result.results as Array<{
        title?: string;
        url?: string;
        snippet?: string;
      }>;
      if (results?.length) {
        for (const r of results) {
          if (r.url && !seen.has(r.url)) {
            seen.add(r.url);
            sources.push({
              title: r.title || getDomain(r.url),
              url: r.url,
              domain: getDomain(r.url),
              snippet: r.snippet,
            });
          }
        }
      }
    }

    // Scraped webpage → single source
    if (result.type === "webpage_content") {
      const url = result.url as string | undefined;
      if (url && !seen.has(url)) {
        seen.add(url);
        sources.push({
          title: (result.title as string) || getDomain(url),
          url,
          domain: getDomain(url),
          snippet: (result.content as string)?.slice(0, 200),
        });
      }
    }
  }

  return sources;
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const sources = isUser ? [] : collectSources(message.parts);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-blue-500 via-violet-500 to-blue-600 text-white shadow-lg shadow-violet-500/20"
            : "glass text-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            if (isUser) {
              return (
                <div key={i} className="whitespace-pre-wrap">
                  {part.text}
                </div>
              );
            }
            // Strip <<suggested reply>> markers before rendering
            const { cleaned } = parseSuggestions(part.text);
            if (!cleaned) return null;
            return <Markdown key={i}>{cleaned}</Markdown>;
          }

          // File parts
          if (part.type === "file") {
            const filePart = part as {
              type: "file";
              mediaType: string;
              url: string;
              filename?: string;
            };
            if (filePart.mediaType.startsWith("image/")) {
              return (
                <img
                  key={i}
                  src={filePart.url}
                  alt={filePart.filename ?? "Uploaded image"}
                  className="mt-2 max-w-full rounded-lg"
                />
              );
            }
            const ext =
              filePart.filename?.split(".").pop()?.toUpperCase() ??
              filePart.mediaType.split("/").pop()?.toUpperCase();
            return (
              <div
                key={i}
                className="mt-2 flex items-center gap-2 glass rounded-lg px-3 py-2 text-xs"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/5 text-foreground-muted text-[10px] font-medium">
                  {ext}
                </span>
                <span className="truncate text-foreground-muted">
                  {filePart.filename ?? "Uploaded file"}
                </span>
              </div>
            );
          }

          // Tool parts
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.replace("tool-", "");
            const toolPart = part as {
              type: string;
              toolCallId: string;
              state: string;
              input?: unknown;
              output?: unknown;
              errorText?: string;
            };

            const display = getToolDisplay(toolName);

            // Loading states
            if (
              toolPart.state === "input-streaming" ||
              toolPart.state === "input-available"
            ) {
              return (
                <div
                  key={i}
                  className="mt-2 flex items-center gap-2 text-xs text-foreground-muted"
                >
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" />
                    <ToolIcon
                      path={display.iconPath}
                      className={`h-3.5 w-3.5 ${display.iconColor} animate-pulse`}
                    />
                  </span>
                  {display.loadingText}...
                </div>
              );
            }

            // Successful output
            if (toolPart.state === "output-available") {
              const result = toolPart.output as Record<string, unknown> | null;
              if (!result) return null;

              // Generated images — thumbnail with click-to-expand lightbox
              if (
                toolName === "generateAdImage" &&
                result.type === "generated_image" &&
                typeof result.url === "string"
              ) {
                return (
                  <div key={i}>
                    <ImageLightbox
                      src={result.url}
                      alt="AI-generated ad image"
                      caption={
                        typeof result.revisedPrompt === "string"
                          ? result.revisedPrompt
                          : undefined
                      }
                    />
                    {typeof result.model === "string" && (
                      <p className="mt-1 text-[10px] text-foreground-muted">
                        Model: {result.model}
                        {typeof result.aspectRatio === "string" ? ` | ${result.aspectRatio}` : ""}
                      </p>
                    )}
                  </div>
                );
              }

              // Generated videos — inline player
              if (
                toolName === "generateAdVideo" &&
                result.type === "generated_video" &&
                typeof result.url === "string"
              ) {
                return (
                  <div key={i} className="mt-2">
                    <video
                      src={result.url as string}
                      controls
                      autoPlay
                      muted
                      loop
                      className="max-w-full rounded-lg"
                      style={{ maxHeight: "400px" }}
                    />
                    <p className="mt-1 text-[10px] text-foreground-muted">
                      {result.model as string} | {result.durationSeconds as number}s
                    </p>
                  </div>
                );
              }

              // Multi-format images — grid
              if (
                toolName === "generateMultiFormatImages" &&
                result.type === "multi_format_images" &&
                Array.isArray(result.images)
              ) {
                const images = result.images as Array<{
                  url: string;
                  model: string;
                  aspectRatio: string;
                }>;
                return (
                  <div key={i} className="mt-2 grid grid-cols-3 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="space-y-1">
                        <ImageLightbox
                          src={img.url}
                          alt={`${img.aspectRatio} ad image`}
                        />
                        <p className="text-[10px] text-foreground-muted text-center">
                          {img.aspectRatio}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              }

              // Creative matrix — variant gallery
              if (
                toolName === "generateCreativeMatrix" &&
                result.type === "creative_matrix" &&
                Array.isArray(result.variants)
              ) {
                const variants = result.variants as Array<{
                  style: string;
                  image: { url: string; model: string; aspectRatio: string };
                  video?: { url: string; model: string; durationSeconds: number };
                }>;
                return (
                  <div key={i} className="mt-2 space-y-2">
                    <p className="text-xs text-foreground-muted">
                      {result.totalVariants as number} variants generated
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {variants.slice(0, 9).map((v, idx) => (
                        <div key={idx} className="space-y-1">
                          <ImageLightbox
                            src={v.image.url}
                            alt={`${v.style} — ${v.image.aspectRatio}`}
                          />
                          <p className="text-[10px] text-foreground-muted text-center truncate">
                            {v.style.split(":")[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                    {variants.length > 9 && (
                      <p className="text-[10px] text-foreground-muted">
                        +{variants.length - 9} more variants
                      </p>
                    )}
                  </div>
                );
              }

              // Web search & scrape — sources are collected into SourcesBar below,
              // so just show the compact header (no expandable body)
              if (
                result.type === "web_search_results" ||
                result.type === "webpage_content"
              ) {
                return (
                  <div
                    key={i}
                    className="mt-2 flex items-center gap-2 text-xs text-foreground-muted"
                  >
                    <ToolIcon
                      path={display.iconPath}
                      className={`h-3.5 w-3.5 shrink-0 ${display.iconColor}`}
                    />
                    <span>{display.label}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-3 w-3 text-emerald-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                );
              }

              return (
                <ToolResultCard
                  key={i}
                  toolName={toolName}
                  result={result}
                />
              );
            }

            // Error state
            if (toolPart.state === "output-error") {
              return (
                <div
                  key={i}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-sm p-2 text-xs text-red-400"
                >
                  <ToolIcon
                    path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    className="h-3.5 w-3.5 text-red-400 shrink-0"
                  />
                  {display.label} failed
                  {toolPart.errorText ? `: ${toolPart.errorText}` : ""}
                </div>
              );
            }

            // Denied state
            if (toolPart.state === "output-denied") {
              return (
                <div
                  key={i}
                  className="mt-2 flex items-center gap-2 text-xs text-foreground-muted italic"
                >
                  <ToolIcon
                    path="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  {display.label} was cancelled
                </div>
              );
            }
          }

          return null;
        })}

        {/* Sources bar at the bottom of AI messages */}
        {sources.length > 0 && <SourcesBar sources={sources} />}
      </div>
    </div>
  );
}
