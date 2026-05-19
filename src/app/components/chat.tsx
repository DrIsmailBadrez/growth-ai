"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChatContext } from "./chat-provider";
import { MessageBubble } from "./message-bubble";
import { MetaConnectButton } from "./meta-connect-button";
import { MicButton } from "./mic-button";
import { SuggestedReplies } from "./suggested-replies";
import { parseSuggestions } from "@/lib/parse-suggestions";

const ACCEPTED_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/csv,text/plain,video/*";

type VoiceState = "idle" | "recording" | "transcribing";

const TEMPLATES = [
  { label: "E-commerce campaign", prompt: "Create a Meta campaign for my online shoe store — target women 25–44 interested in fashion and lifestyle" },
  { label: "Local business ad", prompt: "Generate ad creative for a coffee shop in downtown San Francisco looking to drive foot traffic" },
  { label: "App launch targeting", prompt: "Suggest targeting and ad copy for a fitness app aimed at busy professionals 28–45" },
  { label: "Retargeting campaign", prompt: "Build a retargeting campaign for visitors who didn't convert on my e-commerce site" },
];

export function Chat() {
  const { messages, sendMessage, stop, status, error } = useChatContext();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  const suggestions = (() => {
    if (isLoading || messages.length === 0) return [];
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return [];
    const all: string[] = [];
    for (const part of last.parts) {
      if (part.type === "text" && part.text)
        all.push(...parseSuggestions(part.text).suggestions);
    }
    return all;
  })();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, voiceState]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && files.length === 0) || isLoading) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    sendMessage({ text: input || " ", files: dt.files });
    setInput("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/80 border-2 border-dashed border-foreground-muted">
          <p className="text-sm text-foreground-secondary">Drop files here</p>
        </div>
      )}

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onSelect={(p) => {
            setInput(p);
            requestAnimationFrame(() => textInputRef.current?.focus());
          }} />
        ) : (
          <div className="mx-auto max-w-[740px] space-y-6 px-4 py-6">
            {messages.map((message, i) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={
                  isLoading &&
                  i === messages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))}

            {/* Voice indicator */}
            {voiceState !== "idle" && (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm">
                {voiceState === "recording" ? (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60" />
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span className="text-foreground-secondary">Listening — speak now</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 animate-spin text-foreground-muted" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-foreground-secondary">Transcribing audio...</span>
                  </>
                )}
              </div>
            )}

            {/* Thinking indicator */}
            {isLoading && (() => {
              const lastA = [...messages].reverse().find((m) => m.role === "assistant");
              const hasText = lastA?.parts.some((p) => p.type === "text" && (p as {text?: string}).text?.trim());
              if (hasText) return null;
              return (
                <div className="flex items-center gap-2.5 pl-10 text-sm text-foreground-muted">
                  <div className="flex gap-1">
                    {[0, 0.12, 0.24].map((delay, i) => (
                      <span key={i} className="animate-shimmer-pulse h-1.5 w-1.5 rounded-full bg-foreground-muted" style={{ animationDelay: `${delay}s` }} />
                    ))}
                  </div>
                  <span>Thinking...</span>
                </div>
              );
            })()}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-error-border bg-error-bg px-4 py-3 text-sm">
                <p className="font-medium text-error">Something went wrong</p>
                <p className="mt-0.5 text-xs text-foreground-secondary">{error.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested replies */}
      {suggestions.length > 0 && (
        <SuggestedReplies suggestions={suggestions} onSelect={(text) => sendMessage({ text })} />
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="border-t border-border bg-background-secondary px-4 pt-3 pb-2">
          <div className="mx-auto max-w-[740px] flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-7 w-7 rounded object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-hover font-mono text-[10px] uppercase text-foreground-muted">
                    {file.name.split(".").pop()}
                  </span>
                )}
                <span className="max-w-[120px] truncate text-foreground-secondary">{file.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="ml-1 text-foreground-muted hover:text-error transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border bg-background-secondary px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto max-w-[740px]">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors focus-within:border-zinc-400 focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.04)]">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-md p-1.5 text-foreground-muted hover:bg-hover hover:text-foreground transition-colors"
              title="Attach a file"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <MicButton
              onTranscript={(text) => sendMessage({ text })}
              onStateChange={setVoiceState}
              disabled={isLoading}
            />
            <input
              ref={textInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={files.length > 0 ? "Add a message about your files..." : "Describe the campaign you want to create..."}
              className="flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
              disabled={isLoading}
            />
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-hover transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && files.length === 0}
                className="btn-primary shrink-0 rounded-lg px-4 py-1.5 text-xs font-medium"
              >
                Send
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Empty / template state ─────────────────────────────────── */
function EmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[740px] space-y-6">

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            What would you like to create?
          </h2>
          <p className="text-sm text-foreground-secondary">
            Describe your campaign, or start with a template below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map(({ label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(prompt)}
              className="group card card-hover rounded-xl p-4 text-left"
            >
              <p className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors">
                {label}
              </p>
              <p className="mt-1 text-xs text-foreground-muted leading-relaxed line-clamp-2">
                {prompt}
              </p>
            </button>
          ))}
        </div>

        <div className="pt-1">
          <MetaConnectButton />
        </div>
      </div>
    </div>
  );
}
