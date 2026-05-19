"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageLightbox } from "./image-lightbox";

/* ── Smooth streaming text hook ─────────────────────────────────
   Buffers incoming text and releases it at a steady pace so the
   output never appears in sudden large chunks.
   – At steady state (gap ~5 chars): 2 chars per frame = ~120/s
   – When catching up (gap ~80 chars): 8 chars per frame = ~480/s
   – Non-streaming: returns source text directly (no overhead)
─────────────────────────────────────────────────────────────── */
function useSmoothedText(source: string, streaming: boolean): string {
  const sourceRef = useRef(source);
  const posRef = useRef(streaming ? 0 : source.length);
  const [displayed, setDisplayed] = useState(source);

  // Keep sourceRef always current (runs before effects)
  sourceRef.current = source;

  // When streaming ends, flush remaining text immediately
  useEffect(() => {
    if (!streaming) {
      posRef.current = source.length;
      setDisplayed(source);
    }
  }, [streaming, source]);

  // RAF loop: advances pos toward source.length at controlled pace
  useEffect(() => {
    if (!streaming) return;
    posRef.current = 0;

    let rafId: number;
    const tick = () => {
      const target = sourceRef.current;
      const pos = posRef.current;
      if (pos < target.length) {
        const gap = target.length - pos;
        // Adaptive speed: fast to catch up, slow when near current edge
        const step = gap > 80 ? 8 : gap > 30 ? 4 : gap > 8 ? 2 : 1;
        posRef.current = Math.min(pos + step, target.length);
        setDisplayed(target.slice(0, posRef.current));
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [streaming]); // intentionally only on streaming change

  return streaming ? displayed : source;
}

export function Markdown({ children, streaming }: { children: string; streaming?: boolean }) {
  const isStreaming = streaming ?? false;
  const smoothed = useSmoothedText(children, isStreaming);

  // Trailing cursor class
  const wrapperClass = isStreaming ? "prose-ai prose-ai-streaming" : "prose-ai";

  return (
    <div className={wrapperClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) =>
            src && typeof src === "string" ? (
              <ImageLightbox src={src} alt={alt ?? ""} />
            ) : null,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline decoration-foreground-muted underline-offset-2 hover:decoration-foreground transition-colors"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl border border-border bg-hover p-3.5 text-xs leading-relaxed font-mono">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            if (className) return <code className="text-foreground">{children}</code>;
            return (
              <code className="rounded bg-hover border border-border px-1.5 py-0.5 text-xs text-foreground font-mono">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-hover text-foreground-secondary border-b border-border">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border px-3 py-2 text-foreground-secondary">{children}</td>
          ),
        }}
      >
        {smoothed}
      </ReactMarkdown>
    </div>
  );
}
