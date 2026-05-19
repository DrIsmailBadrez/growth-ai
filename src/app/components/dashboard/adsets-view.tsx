"use client";

import type { MetaAdSet, MetaInsightsFull, MetaInsightsTimeSeries, DatePreset } from "@/lib/meta/types";
import { useDashboardData } from "@/app/hooks/use-dashboard-data";
import { MetricsGrid } from "./metrics-grid";
import { PerformanceChart } from "./performance-chart";
import { ActionsBreakdown } from "./actions-breakdown";
import { EntityTable, statusColumn, nameColumn, spendColumn, impressionsColumn, clicksColumn, ctrColumn, cpcColumn } from "./entity-table";
import { DashboardSkeleton } from "./loading-skeleton";
import type { Column } from "./entity-table";

interface AdSetsViewProps {
  campaignId: string;
  datePreset: DatePreset;
  onSelectAdSet: (adSet: MetaAdSet) => void;
}

interface CampaignData {
  adSets: MetaAdSet[];
  campaignInsights: MetaInsightsFull | null;
  campaignTimeSeries: MetaInsightsTimeSeries[];
  adSetInsights: Record<string, MetaInsightsFull | null>;
}

function budgetColumn(): Column<MetaAdSet> {
  return {
    key: "budget",
    label: "Budget",
    align: "right",
    render: (item) => {
      const val = item.daily_budget ? `$${(parseInt(item.daily_budget) / 100).toFixed(2)}/day` : "--";
      return <span className="font-mono text-foreground-muted text-xs">{val}</span>;
    },
  };
}

function goalColumn(): Column<MetaAdSet> {
  return {
    key: "goal",
    label: "Goal",
    render: (item) => (
      <span className="text-xs text-foreground-muted">
        {item.optimization_goal?.replace(/_/g, " ") ?? "--"}
      </span>
    ),
  };
}

export function AdSetsView({ campaignId, datePreset, onSelectAdSet }: AdSetsViewProps) {
  const { data, loading, error } = useDashboardData<CampaignData>(
    `/api/dashboard/campaign/${campaignId}?datePreset=${datePreset}`,
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

  const columns: Column<MetaAdSet>[] = [
    statusColumn(),
    nameColumn(),
    budgetColumn(),
    goalColumn(),
    spendColumn(),
    impressionsColumn(),
    clicksColumn(),
    ctrColumn(),
    cpcColumn(),
  ];

  return (
    <div className="space-y-6">
      <MetricsGrid insights={data.campaignInsights} />
      <PerformanceChart timeSeries={data.campaignTimeSeries} />
      <ActionsBreakdown
        actions={data.campaignInsights?.actions}
        costPerAction={data.campaignInsights?.cost_per_action_type}
      />
      <EntityTable
        items={data.adSets}
        columns={columns}
        insights={data.adSetInsights}
        getId={(s) => s.id}
        onRowClick={onSelectAdSet}
        emptyMessage="No ad sets in this campaign"
      />
    </div>
  );
}
