"use client";

import type { MetaAction } from "@/lib/meta/types";
import { formatNumber, formatCurrency } from "@/lib/format";

interface ActionsBreakdownProps {
  actions?: MetaAction[];
  costPerAction?: MetaAction[];
}

const ACTION_LABELS: Record<string, string> = {
  link_click: "Link Clicks",
  landing_page_view: "Landing Page Views",
  page_engagement: "Page Engagement",
  post_engagement: "Post Engagement",
  post_reaction: "Post Reactions",
  comment: "Comments",
  post: "Post Shares",
  like: "Page Likes",
  video_view: "Video Views",
  photo_view: "Photo Views",
  purchase: "Purchases",
  add_to_cart: "Add to Cart",
  initiate_checkout: "Initiate Checkout",
  lead: "Leads",
  complete_registration: "Registrations",
  onsite_conversion: "On-Site Conversions",
  offsite_conversion: "Off-Site Conversions",
};

function formatActionType(type: string): string {
  return ACTION_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ActionsBreakdown({ actions, costPerAction }: ActionsBreakdownProps) {
  if (!actions?.length) return null;

  const costMap = new Map(costPerAction?.map((c) => [c.action_type, c.value]) ?? []);

  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Actions Breakdown</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-hover">
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Action</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Count</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Cost</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.action_type} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                <td className="px-4 py-2.5 text-foreground">{formatActionType(action.action_type)}</td>
                <td className="px-4 py-2.5 text-foreground text-right font-mono tabular-nums">{formatNumber(action.value)}</td>
                <td className="px-4 py-2.5 text-foreground-secondary text-right font-mono tabular-nums">
                  {costMap.has(action.action_type) ? formatCurrency(costMap.get(action.action_type)!) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
