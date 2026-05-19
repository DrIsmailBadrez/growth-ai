"use client";

import { useEffect } from "react";
import type { MetaAd, MetaInsightsFull, MetaInsightsTimeSeries, DatePreset } from "@/lib/meta/types";
import { useDashboardData } from "@/app/hooks/use-dashboard-data";
import { MetricsGrid } from "./metrics-grid";
import { PerformanceChart } from "./performance-chart";
import { ActionsBreakdown } from "./actions-breakdown";
import { StatusBadge } from "./status-badge";

interface AdDetailPanelProps {
  ad: MetaAd;
  insights: MetaInsightsFull | null;
  datePreset: DatePreset;
  onClose: () => void;
}

interface AdData {
  adInsights: MetaInsightsFull | null;
  adTimeSeries: MetaInsightsTimeSeries[];
}

export function AdDetailPanel({ ad, insights, datePreset, onClose }: AdDetailPanelProps) {
  const { data } = useDashboardData<AdData>(
    `/api/dashboard/ad/${ad.id}?datePreset=${datePreset}`,
    [datePreset]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const fullInsights = data?.adInsights ?? insights;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l border-border z-50 overflow-y-auto animate-in slide-in-from-right duration-200 shadow-xl">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={ad.status} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{ad.name}</h2>
              <p className="text-xs text-foreground-muted font-mono mt-0.5">{ad.id}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg border border-border hover:bg-hover transition-colors"
              aria-label="Close panel"
            >
              <svg className="h-4 w-4 text-foreground-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Creative preview */}
          {ad.creative && (
            <div className="card rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Creative</h3>
              {ad.creative.thumbnail_url && (
                <img
                  src={ad.creative.thumbnail_url}
                  alt={ad.creative.title ?? "Ad preview"}
                  className="rounded-lg w-full max-h-64 object-contain bg-hover"
                />
              )}
              {ad.creative.title && (
                <p className="text-sm font-medium text-foreground">{ad.creative.title}</p>
              )}
              {ad.creative.body && (
                <p className="text-sm text-foreground-secondary">{ad.creative.body}</p>
              )}
            </div>
          )}

          {/* Metrics */}
          <MetricsGrid insights={fullInsights} showRankings />

          {/* Chart */}
          {data?.adTimeSeries && data.adTimeSeries.length > 0 && (
            <PerformanceChart timeSeries={data.adTimeSeries} />
          )}

          {/* Actions */}
          <ActionsBreakdown
            actions={fullInsights?.actions}
            costPerAction={fullInsights?.cost_per_action_type}
          />
        </div>
      </div>
    </>
  );
}
