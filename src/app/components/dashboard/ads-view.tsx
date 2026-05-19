"use client";

import { useState } from "react";
import type { MetaAd, MetaInsightsFull, MetaInsightsTimeSeries, DatePreset } from "@/lib/meta/types";
import { useDashboardData } from "@/app/hooks/use-dashboard-data";
import { MetricsGrid } from "./metrics-grid";
import { PerformanceChart } from "./performance-chart";
import { ActionsBreakdown } from "./actions-breakdown";
import { EntityTable, statusColumn, nameColumn, spendColumn, impressionsColumn, clicksColumn, ctrColumn, cpcColumn } from "./entity-table";
import { DashboardSkeleton } from "./loading-skeleton";
import { AdDetailPanel } from "./ad-detail-panel";
import { formatRanking } from "@/lib/format";
import type { Column } from "./entity-table";

interface AdsViewProps {
  adSetId: string;
  datePreset: DatePreset;
}

interface AdSetData {
  ads: MetaAd[];
  adSetInsights: MetaInsightsFull | null;
  adSetTimeSeries: MetaInsightsTimeSeries[];
  adInsights: Record<string, MetaInsightsFull | null>;
}

function thumbnailColumn(): Column<MetaAd> {
  return {
    key: "thumbnail",
    label: "",
    width: "48px",
    render: (item) =>
      item.creative?.thumbnail_url ? (
        <img
          src={item.creative.thumbnail_url}
          alt=""
          className="h-8 w-8 rounded object-cover border border-border"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-hover border border-border flex items-center justify-center">
          <svg className="h-4 w-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </div>
      ),
  };
}

function headlineColumn(): Column<MetaAd> {
  return {
    key: "headline",
    label: "Headline",
    render: (item) => (
      <span className="text-xs text-foreground-muted truncate max-w-[200px] block">
        {item.creative?.title ?? "--"}
      </span>
    ),
  };
}

function qualityColumn(): Column<MetaAd> {
  return {
    key: "quality",
    label: "Quality",
    render: (_, ins) => {
      if (!ins?.quality_ranking) return <span className="text-xs text-foreground-muted">--</span>;
      const { label, color } = formatRanking(ins.quality_ranking);
      return <span className={`text-xs ${color}`}>{label}</span>;
    },
  };
}

export function AdsView({ adSetId, datePreset }: AdsViewProps) {
  const [selectedAd, setSelectedAd] = useState<MetaAd | null>(null);

  const { data, loading, error } = useDashboardData<AdSetData>(
    `/api/dashboard/adset/${adSetId}?datePreset=${datePreset}`,
    [datePreset]
  );

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="card rounded-xl p-8 text-center">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const columns: Column<MetaAd>[] = [
    thumbnailColumn(),
    statusColumn(),
    nameColumn(),
    headlineColumn(),
    spendColumn(),
    impressionsColumn(),
    clicksColumn(),
    ctrColumn(),
    cpcColumn(),
    qualityColumn(),
  ];

  return (
    <div className="space-y-6">
      <MetricsGrid insights={data.adSetInsights} />
      <PerformanceChart timeSeries={data.adSetTimeSeries} />
      <ActionsBreakdown
        actions={data.adSetInsights?.actions}
        costPerAction={data.adSetInsights?.cost_per_action_type}
      />
      <EntityTable
        items={data.ads}
        columns={columns}
        insights={data.adInsights}
        getId={(a) => a.id}
        onRowClick={setSelectedAd}
        emptyMessage="No ads in this ad set"
      />

      {selectedAd && (
        <AdDetailPanel
          ad={selectedAd}
          insights={data.adInsights[selectedAd.id] ?? null}
          datePreset={datePreset}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  );
}
