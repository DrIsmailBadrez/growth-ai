"use client";

const STATUS_CONFIGS: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  PAUSED:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  ARCHIVED: { bg: "bg-hover",     text: "text-foreground-muted", dot: "bg-zinc-400" },
  DELETED:  { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIGS[status] ?? STATUS_CONFIGS.ARCHIVED;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const c = STATUS_CONFIGS[status] ?? STATUS_CONFIGS.ARCHIVED;
  return <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} title={status} />;
}
