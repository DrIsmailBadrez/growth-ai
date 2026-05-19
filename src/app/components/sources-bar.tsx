"use client";

import { useState } from "react";

export interface Source {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

export function SourcesBar({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2.5 pt-2.5 border-t border-border">
      <div className="flex items-center gap-1.5 mb-2">
        <svg className="h-3 w-3 text-foreground-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        <span className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider">Sources</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, i) => (
          <SourcePill key={`${source.url}-${i}`} source={source} index={i} />
        ))}
      </div>
    </div>
  );
}

function SourcePill({ source, index }: { source: Source; index: number }) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-1.5 rounded-full border border-border bg-background pl-1.5 pr-2.5 py-1 text-[11px] text-foreground-secondary hover:border-border-hover hover:bg-hover hover:text-foreground transition-colors"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-hover text-[9px] font-semibold text-foreground-muted">
          {index + 1}
        </span>
        <img
          src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
          alt=""
          width={12}
          height={12}
          className="rounded-sm shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span className="truncate max-w-[120px]">{source.domain}</span>
      </a>

      {/* Hover popover */}
      {showPopover && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 pointer-events-none">
          <div className="rounded-xl border border-border bg-background-secondary p-3 shadow-lg shadow-black/[0.06]">
            <div className="flex items-start gap-2">
              <img
                src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
                alt=""
                width={14}
                height={14}
                className="rounded-sm shrink-0 mt-0.5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">{source.title}</p>
                <p className="text-[10px] text-foreground-muted mt-0.5 truncate">{source.domain}</p>
              </div>
            </div>
            {source.snippet && (
              <p className="text-[11px] text-foreground-secondary mt-2 leading-relaxed line-clamp-3">{source.snippet}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
