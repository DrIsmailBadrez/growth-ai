"use client";

import { useState } from "react";
import { getToolDisplay } from "./tool-display-config";
import { ToolIcon } from "./tool-icon";

interface ToolResultCardProps {
  toolName: string;
  result: Record<string, unknown>;
}

type CardVariant = "success" | "info" | "warning" | "default";

function getVariant(type: string): CardVariant {
  if (type === "error") return "warning";
  if (type.endsWith("_created") || type === "pixel_created") return "success";
  if (type === "meta_connection") return "info";
  if (type === "meta_disconnected") return "warning";
  return "default";
}

const VARIANT_STYLES: Record<CardVariant, { container: string; icon: string }> = {
  success:  { container: "border-green-200 bg-green-50",  icon: "text-green-600" },
  info:     { container: "border-blue-200 bg-blue-50",    icon: "text-blue-600" },
  warning:  { container: "border-amber-200 bg-amber-50",  icon: "text-amber-600" },
  default:  { container: "border-border bg-background-secondary", icon: "text-foreground-muted" },
};

export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  if (!result) return null;

  const display = getToolDisplay(toolName);
  const type = (result.type as string) ?? "";
  const variant = getVariant(type);
  const styles = VARIANT_STYLES[variant];

  const startsOpen = type === "error" || type === "meta_connection" || type.endsWith("_created");
  const [open, setOpen] = useState(startsOpen);

  const body = renderBody(toolName, type, result);
  const hasBody = body !== null;

  return (
    <div className={`mt-1.5 rounded-xl border text-xs overflow-hidden ${styles.container}`}>
      <button
        type="button"
        onClick={() => hasBody && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
          hasBody ? "hover:brightness-[0.97] cursor-pointer" : "cursor-default"
        }`}
      >
        <ToolIcon path={display.iconPath} className={`h-3.5 w-3.5 shrink-0 ${styles.icon}`} />
        <span className="font-medium text-foreground flex-1">{display.label}</span>
        {variant === "success" && (
          <svg className="h-3.5 w-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
        {hasBody && variant !== "success" && (
          <svg className={`h-3 w-3 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {hasBody && open && (
        <div className="px-3 pb-3 pt-0.5 border-t border-black/[0.06]">
          {body}
        </div>
      )}
    </div>
  );
}

function renderBody(toolName: string, type: string, result: Record<string, unknown>) {
  if (type === "error") {
    return <p className="text-amber-700">{result.message as string}</p>;
  }

  if (type === "meta_connection") {
    return (
      <p className={result.connected ? "text-green-700" : "text-amber-700"}>
        {result.message as string}
      </p>
    );
  }

  if (type === "meta_disconnected") {
    return <p className="text-amber-700">{result.message as string}</p>;
  }

  if (type === "campaign_created" || type === "adset_created" || type === "creative_created" || type === "ad_created") {
    return (
      <p className="text-green-700">
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
          <li key={page.id} className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-foreground-muted shrink-0" />
            <span className="text-foreground">{page.name}</span>
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
          <li key={acc.id} className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-foreground-muted shrink-0" />
            <span className="text-foreground">{acc.name}</span>
            <span className="text-foreground-muted font-mono">({acc.id})</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "campaigns") {
    const campaigns = result.campaigns as Array<{ id: string; name: string; status: string }>;
    if (!campaigns?.length) return <p className="text-foreground-muted">No campaigns found</p>;
    return (
      <ul className="space-y-1">
        {campaigns.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <StatusDot status={c.status} />
            <span className="text-foreground">{c.name}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "insights") {
    const insights = result.insights as Array<{ impressions: string; clicks: string; spend: string; ctr: string }>;
    if (!insights?.length) return <p className="text-foreground-muted">No insight data</p>;
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {insights.map((ins, i) => (
          <div key={i} className="space-y-0.5 text-foreground-secondary">
            <div>Impressions: <span className="text-foreground font-medium">{ins.impressions}</span></div>
            <div>Clicks: <span className="text-foreground font-medium">{ins.clicks}</span></div>
            <div>Spend: <span className="text-foreground font-medium">${ins.spend}</span></div>
            <div>CTR: <span className="text-foreground font-medium">{ins.ctr}%</span></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "web_search_results" || type === "webpage_content") return null;

  if (type === "pixels") {
    const pixels = result.pixels as Array<{ id: string; name: string }>;
    if (!pixels?.length) return <p className="text-foreground-muted">No pixels on this account</p>;
    return (
      <ul className="space-y-1">
        {pixels.map((px) => (
          <li key={px.id} className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-foreground-muted shrink-0" />
            <span className="text-foreground">{px.name}</span>
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
        <p className="text-green-700">Pixel ID: <span className="font-mono">{result.id as string}</span></p>
        {code && (
          <details className="text-foreground-secondary">
            <summary className="cursor-pointer hover:text-foreground transition-colors">Installation code</summary>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-background border border-border p-2.5 text-[10px] leading-relaxed text-foreground-secondary font-mono">{code}</pre>
          </details>
        )}
      </div>
    );
  }

  if (type === "targeting_suggestion" || type === "ad_copy_request") return null;

  return null;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-500",
    PAUSED: "bg-amber-500",
    ARCHIVED: "bg-zinc-400",
    DELETED: "bg-red-500",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status] ?? "bg-zinc-400"}`} title={status} />;
}
