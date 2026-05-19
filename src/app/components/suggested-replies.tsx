"use client";

interface SuggestedRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestedReplies({ suggestions, onSelect }: SuggestedRepliesProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-border bg-background-secondary px-4 py-3">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap gap-2 justify-end">
          {suggestions.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(text)}
              className="suggestion-pill"
            >
              {text}
              <svg className="h-3 w-3 shrink-0 text-foreground-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
