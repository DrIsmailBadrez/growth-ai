"use client";

import { useState } from "react";
import { getToolDisplay } from "./tool-display-config";
import { ToolIcon } from "./tool-icon";

interface ToolResultCardProps {
  toolName: string;
  result: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  error: "border-red-500/20 bg-red-500/10",
  meta_connection: "border-blue-500/20 bg-blue-500/10",
  campaign_created: "border-emerald-500/20 bg-emerald-500/10",
  adset_created: "border-emerald-500/20 bg-emerald-500/10",
  creative_created: "border-emerald-500/20 bg-emerald-500/10",
  ad_created: "border-emerald-500/20 bg-emerald-500/10",
  generated_video: "border-rose-500/20 bg-rose-500/10",
  multi_format_images: "border-pink-500/20 bg-pink-500/10",
  creative_matrix: "border-orange-500/20 bg-orange-500/10",
  status_updated: "border-emerald-500/20 bg-emerald-500/10",
  pages: "border-blue-500/20 bg-blue-500/5",
  pixels: "border-violet-500/20 bg-violet-500/5",
  pixel_created: "border-emerald-500/20 bg-emerald-500/10",
  meta_disconnected: "border-amber-500/20 bg-amber-500/10",
  web_search_results: "border-blue-500/20 bg-blue-500/5",
  webpage_content: "border-violet-500/20 bg-violet-500/5",
};

export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  if (!result) return null;

  const display = getToolDisplay(toolName);
  const type = (result.type as string) ?? "";
  const colorClass =
    STATUS_COLORS[type] ?? "border-white/5 bg-white/[0.03]";

  // Most tool results start collapsed — errors and small results stay open
  const startsOpen =
    type === "error" ||
    type === "meta_connection" ||
    type.endsWith("_created");

  const [open, setOpen] = useState(startsOpen);

  const body = renderBody(toolName, type, result);
  const hasBody = body !== null;

  return (
    <div
      className={`mt-2 rounded-lg border text-xs backdrop-blur-sm overflow-hidden ${colorClass}`}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => hasBody && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
          hasBody ? "hover:bg-white/5 cursor-pointer" : "cursor-default"
        }`}
      >
        <ToolIcon
          path={display.iconPath}
          className={`h-3.5 w-3.5 shrink-0 ${display.iconColor}`}
        />
        <span className="font-medium text-foreground flex-1">
          {display.label}
        </span>
        {hasBody && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`h-3 w-3 text-foreground-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        )}
      </button>

      {/* Expandable body */}
      {hasBody && open && (
        <div className="px-3 pb-2.5 pt-0.5 border-t border-white/5">
          {body}
        </div>
      )}
    </div>
  );
}

/* ---------- Body renderer by result type ---------- */

function renderBody(
  toolName: string,
  type: string,
  result: Record<string, unknown>
) {
  if (type === "error") {
    return <p className="text-red-400">{result.message as string}</p>;
  }

  if (type === "meta_connection") {
    return (
      <p className={result.connected ? "text-emerald-400" : "text-amber-400"}>
        {result.message as string}
      </p>
    );
  }

  if (type === "meta_disconnected") {
    return (
      <p className="text-amber-400">{result.message as string}</p>
    );
  }

  if (
    type === "campaign_created" ||
    type === "adset_created" ||
    type === "creative_created" ||
    type === "ad_created"
  ) {
    return (
      <p className="text-emerald-400">
        ID: <span className="font-mono">{result.id as string}</span>
      </p>
    );
  }

  if (type === "pages") {
    const pages = result.pages as Array<{ id: string; name: string; category: string }>;
    if (!pages?.length) return <p className="text-foreground-muted">No Pages found</p>;
    return (
      <ul className="space-y-1">
        {pages.map((page) => (
          <li key={page.id} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />
            <span>{page.name}</span>
            <span className="text-foreground-muted">({page.category})</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "ad_accounts") {
    const accounts = result.accounts as Array<{ id: string; name: string }>;
    if (!accounts?.length) return <p className="text-foreground-muted">No accounts found</p>;
    return (
      <ul className="space-y-1">
        {accounts.map((acc) => (
          <li key={acc.id} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />
            <span>{acc.name}</span>
            <span className="text-foreground-muted font-mono">({acc.id})</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "campaigns") {
    const campaigns = result.campaigns as Array<{
      id: string;
      name: string;
      status: string;
    }>;
    if (!campaigns?.length) return <p className="text-foreground-muted">No campaigns found</p>;
    return (
      <ul className="space-y-1">
        {campaigns.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <span>{c.name}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "insights") {
    const insights = result.insights as Array<{
      impressions: string;
      clicks: string;
      spend: string;
      ctr: string;
    }>;
    if (!insights?.length) return <p className="text-foreground-muted">No insight data</p>;
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {insights.map((insight, i) => (
          <div key={i} className="space-y-0.5 text-foreground-muted">
            <div>
              Impressions:{" "}
              <span className="text-foreground">{insight.impressions}</span>
            </div>
            <div>
              Clicks:{" "}
              <span className="text-foreground">{insight.clicks}</span>
            </div>
            <div>
              Spend:{" "}
              <span className="text-foreground">${insight.spend}</span>
            </div>
            <div>
              CTR:{" "}
              <span className="text-foreground">{insight.ctr}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Web search & scrape results are rendered via SourcesBar in MessageBubble
  // so they won't reach this component. This fallback handles edge cases.
  if (type === "web_search_results" || type === "webpage_content") {
    return null;
  }

  if (type === "pixels") {
    const pixels = result.pixels as Array<{ id: string; name: string }>;
    if (!pixels?.length) return <p className="text-foreground-muted">No pixels found on this account</p>;
    return (
      <ul className="space-y-1">
        {pixels.map((px) => (
          <li key={px.id} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" />
            <span>{px.name}</span>
            <span className="text-foreground-muted font-mono">({px.id})</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "pixel_created") {
    const code = result.code as string | undefined;
    return (
      <div className="space-y-1.5">
        <p className="text-emerald-400">
          Pixel ID: <span className="font-mono">{result.id as string}</span>
        </p>
        {code && (
          <details className="text-foreground-muted">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              Installation code
            </summary>
            <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-2 text-[10px] leading-relaxed">
              {code}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (type === "creative_matrix") {
    const totalVariants = result.totalVariants as number;
    const variants = result.variants as Array<{
      style: string;
      image: { model: string; aspectRatio: string };
      video?: { model: string; durationSeconds: number };
    }>;
    const models = [...new Set(variants.map((v) => v.image.model))];
    const ratios = [...new Set(variants.map((v) => v.image.aspectRatio))];
    const styles = [...new Set(variants.map((v) => v.style))];
    const videoCount = variants.filter((v) => v.video).length;

    return (
      <div className="space-y-1 text-foreground-muted">
        <p>
          <span className="text-foreground font-medium">{totalVariants}</span>{" "}
          variants generated
        </p>
        <p>Styles: {styles.join(", ")}</p>
        <p>Models: {models.join(", ")}</p>
        <p>Ratios: {ratios.join(", ")}</p>
        {videoCount > 0 && <p>Videos: {videoCount}</p>}
      </div>
    );
  }

  if (type === "status_updated") {
    return (
      <p className="text-emerald-400">{result.message as string}</p>
    );
  }

  // Targeting / copy — the content is in the markdown text above
  if (type === "targeting_suggestion" || type === "ad_copy_request") {
    return null; // No expandable body — the label alone is enough
  }

  return null;
}

/* ---------- Helpers ---------- */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-400 status-dot-glow text-emerald-400",
    PAUSED: "bg-yellow-400 status-dot-glow text-yellow-400",
    ARCHIVED: "bg-zinc-400",
    DELETED: "bg-red-400 status-dot-glow text-red-400",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        colors[status] ?? "bg-zinc-400"
      }`}
      title={status}
    />
  );
}
