"use client";

import { useEffect, useState, useCallback } from "react";

const WORD1 = "GROWTH";
const WORD2 = "AI";
const TOTAL_CHARS = WORD1.length + WORD2.length;
const CHAR_MS = 120;
const CTA_DELAY = 1100;
const EXIT_MS = 520;

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  const [typed, setTyped] = useState(0);
  const [showCta, setShowCta] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [exiting, setExiting] = useState(false);

  // Type letters one by one
  useEffect(() => {
    if (typed >= TOTAL_CHARS) return;
    const t = setTimeout(() => setTyped((n) => n + 1), CHAR_MS);
    return () => clearTimeout(t);
  }, [typed]);

  // Reveal CTA after typing finishes
  useEffect(() => {
    if (typed < TOTAL_CHARS) return;
    const t = setTimeout(() => setShowCta(true), CTA_DELAY);
    return () => clearTimeout(t);
  }, [typed]);

  // Check Meta connection status concurrently with typing
  useEffect(() => {
    fetch("/api/meta/status")
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onComplete, EXIT_MS);
  }, [onComplete]);

  // If already connected, auto-dismiss shortly after CTA appears
  useEffect(() => {
    if (!showCta || connected !== true) return;
    const t = setTimeout(dismiss, 500);
    return () => clearTimeout(t);
  }, [showCta, connected, dismiss]);

  const handleConnect = () => {
    try { sessionStorage.setItem("splash-seen", "true"); } catch {}
    window.location.href = "/api/meta/auth";
  };

  const typingDone = typed >= TOTAL_CHARS;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{
        opacity: exiting ? 0 : 1,
        pointerEvents: exiting ? "none" : undefined,
        transition: exiting ? `opacity ${EXIT_MS}ms cubic-bezier(0.4,0,0.2,1)` : undefined,
      }}
    >
      {/* Brand words — two separate groups so the gap is always visible */}
      <div className="flex items-end gap-[0.55em]" style={{ letterSpacing: "0.25em" }}>
        {/* GROWTH */}
        <div className="flex items-end">
          {WORD1.split("").map((letter, i) => (
            <span
              key={i}
              className="text-[3.25rem] font-semibold text-foreground leading-none"
              style={{
                opacity: i < typed ? 1 : 0,
                transform: i < typed ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.18s ease, transform 0.22s ease",
              }}
            >
              {letter}
            </span>
          ))}
        </div>
        {/* AI */}
        <div className="flex items-end">
          {WORD2.split("").map((letter, i) => (
            <span
              key={i}
              className="text-[3.25rem] font-semibold text-foreground leading-none"
              style={{
                opacity: (WORD1.length + i) < typed ? 1 : 0,
                transform: (WORD1.length + i) < typed ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.18s ease, transform 0.22s ease",
              }}
            >
              {letter}
            </span>
          ))}
        </div>
        {/* Blinking cursor while typing */}
        <span
          className="text-[3.25rem] font-light leading-none text-foreground-muted"
          style={{
            opacity: typingDone ? 0 : 1,
            transition: "opacity 0.5s ease",
            animationName: typingDone ? "none" : "blink-caret",
            animationDuration: "0.9s",
            animationTimingFunction: "step-end",
            animationIterationCount: "infinite",
          }}
        >
          |
        </span>
      </div>

      {/* CTA — fades up after typing */}
      <div
        className="mt-10 flex flex-col items-center gap-5"
        style={{
          opacity: showCta ? 1 : 0,
          transform: showCta ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Loading state */}
        {connected === null && (
          <div className="flex items-center gap-2 text-sm text-foreground-muted h-10">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Already connected */}
        {connected === true && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Meta account connected
          </div>
        )}

        {/* Not connected */}
        {connected === false && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-foreground-secondary">
              Connect your Meta Ads account to begin
            </p>
            <button
              onClick={handleConnect}
              className="btn-primary inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-medium"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
              </svg>
              Connect Meta Account
            </button>
            <button
              onClick={dismiss}
              className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors"
            >
              I'll do this later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
