"use client";

import type { MetaCampaign, MetaInsightsFull, MetaInsightsTimeSeries, DatePreset } from "@/lib/meta/types";
import { useDashboardData } from "@/app/hooks/use-dashboard-data";
import { MetricsGrid } from "./metrics-grid";
import { PerformanceChart } from "./performance-chart";
import { EntityTable, statusColumn, nameColumn, spendColumn, impressionsColumn, clicksColumn, ctrColumn, cpcColumn } from "./entity-table";
import { DashboardSkeleton } from "./loading-skeleton";
import type { Column } from "./entity-table";

interface CampaignsViewProps {
  accountId: string;
  datePreset: DatePreset;
  onSelectCampaign: (campaign: MetaCampaign) => void;
}

interface AccountData {
  campaigns: MetaCampaign[];
  accountInsights: MetaInsightsFull | null;
  accountTimeSeries: MetaInsightsTimeSeries[];
  campaignInsights: Record<string, MetaInsightsFull | null>;
}

function objectiveColumn(): Column<MetaCampaign> {
  return {
    key: "objective",
    label: "Objective",
    render: (item) => (
      <span className="text-xs text-foreground-muted">
        {item.objective?.replace(/_/g, " ") ?? "--"}
      </span>
    ),
  };
}

export function CampaignsView({ accountId, datePreset, onSelectCampaign }: CampaignsViewProps) {
  const { data, loading, error } = useDashboardData<AccountData>(
    `/api/dashboard/account/${accountId}?datePreset=${datePreset}`,
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

  const columns: Column<MetaCampaign>[] = [
    statusColumn(),
    nameColumn(),
    objectiveColumn(),
    spendColumn(),
    impressionsColumn(),
    clicksColumn(),
    ctrColumn(),
    cpcColumn(),
  ];

  return (
    <div className="space-y-6">
      <MetricsGrid insights={data.accountInsights} />
      <PerformanceChart timeSeries={data.accountTimeSeries} />
      <EntityTable
        items={data.campaigns}
        columns={columns}
        insights={data.campaignInsights}
        getId={(c) => c.id}
        onRowClick={onSelectCampaign}
        emptyMessage="No campaigns in this account"
      />
    </div>
  );
}
