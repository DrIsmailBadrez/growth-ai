"use client";

import type { MetaInsightsFull } from "@/lib/meta/types";
import { formatCurrency, formatCompact, formatPercent, formatRanking } from "@/lib/format";

interface MetricsGridProps {
  insights: MetaInsightsFull | null;
  showRankings?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
}

function MetricCard({ label, value, subValue }: MetricCardProps) {
  return (
    <div className="card rounded-xl p-4 space-y-1.5">
      <p className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
      {subValue && <p className="text-xs text-foreground-muted">{subValue}</p>}
    </div>
  );
}

function RankingCard({ label, ranking }: { label: string; ranking?: string }) {
  const { label: rankLabel, color } = formatRanking(ranking);
  return (
    <div className="card rounded-xl p-4 space-y-1.5">
      <p className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{rankLabel}</p>
    </div>
  );
}

export function MetricsGrid({ insights, showRankings = false }: MetricsGridProps) {
  if (!insights) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {["Spend", "Impressions", "Reach", "Clicks", "CTR"].map((label) => (
          <MetricCard key={label} label={label} value="—" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Spend"       value={formatCurrency(insights.spend)} />
        <MetricCard label="Impressions" value={formatCompact(insights.impressions)} />
        <MetricCard label="Reach"       value={formatCompact(insights.reach)} />
        <MetricCard label="Clicks"      value={formatCompact(insights.clicks)} />
        <MetricCard label="CTR"         value={formatPercent(insights.ctr)} />
        <MetricCard label="CPC"         value={formatCurrency(insights.cpc)} />
        <MetricCard label="CPM"         value={formatCurrency(insights.cpm)} />
        <MetricCard label="Frequency"   value={parseFloat(insights.frequency || "0").toFixed(2)} />
      </div>

      {showRankings && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RankingCard label="Quality Ranking"    ranking={insights.quality_ranking} />
          <RankingCard label="Engagement Ranking" ranking={insights.engagement_rate_ranking} />
          <RankingCard label="Conversion Ranking" ranking={insights.conversion_rate_ranking} />
        </div>
      )}
    </div>
  );
}
