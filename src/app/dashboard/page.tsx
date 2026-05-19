"use client";

import { useState, useCallback } from "react";
import type { MetaAdAccount, MetaCampaign, MetaAdSet, DatePreset, BreadcrumbItem, DashboardLevel } from "@/lib/meta/types";
import { useDashboardData } from "@/app/hooks/use-dashboard-data";
import { Breadcrumbs } from "../components/dashboard/breadcrumbs";
import { DateRangePicker } from "../components/dashboard/date-range-picker";
import { AccountsList } from "../components/dashboard/accounts-list";
import { CampaignsView } from "../components/dashboard/campaigns-view";
import { AdSetsView } from "../components/dashboard/adsets-view";
import { AdsView } from "../components/dashboard/ads-view";
import { MetaConnectButton } from "../components/meta-connect-button";

interface AccountsResponse {
  accounts: MetaAdAccount[];
  error?: string;
}

export default function DashboardPage() {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7d");

  const { data, loading, error } = useDashboardData<AccountsResponse>("/api/dashboard");

  const currentLevel: DashboardLevel = breadcrumbs.length === 0
    ? "accounts"
    : breadcrumbs[breadcrumbs.length - 1].level;

  const currentId = breadcrumbs.length > 0
    ? breadcrumbs[breadcrumbs.length - 1].id
    : null;

  const handleNavigate = useCallback((index: number) => {
    if (index < 0) setBreadcrumbs([]);
    else setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }, []);

  const drillDown = useCallback((level: DashboardLevel, id: string, label: string) => {
    setBreadcrumbs((prev) => [...prev, { level, id, label }]);
  }, []);

  const handleSelectAccount  = useCallback((a: MetaAdAccount) => drillDown("account",  a.id,  a.name || `Account ${a.account_id}`), [drillDown]);
  const handleSelectCampaign = useCallback((c: MetaCampaign)  => drillDown("campaign", c.id,  c.name), [drillDown]);
  const handleSelectAdSet    = useCallback((s: MetaAdSet)     => drillDown("adset",    s.id,  s.name), [drillDown]);

  const insideAccount = breadcrumbs.length > 0;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 w-full max-w-2xl px-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-hover animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Not connected ── */
  if (error === "HTTP 401" || data?.error === "Not connected to Meta") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Connect your Meta account</h2>
          <p className="text-sm text-foreground-secondary max-w-sm">
            Link your Meta Business account to view campaign performance and analytics.
          </p>
        </div>
        <MetaConnectButton />
      </div>
    );
  }

  /* ── Error ── */
  if (error || data?.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-4">
        <div className="rounded-xl border border-error-border bg-error-bg px-5 py-4 max-w-md">
          <p className="text-sm font-medium text-error">Failed to load dashboard</p>
          <p className="mt-1 text-xs text-foreground-secondary">{error ?? data?.error}</p>
        </div>
      </div>
    );
  }

  const accounts = data?.accounts ?? [];

  return (
    <div className="h-full overflow-y-auto">
      {/* Toolbar — always shown */}
      <div className="sticky top-0 z-30 border-b border-border bg-background-secondary/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            {insideAccount ? (
              <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigate} />
            ) : (
              /* Accounts level — title + account count */
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
                {accounts.length > 0 && (
                  <>
                    <span className="text-foreground-muted/30 select-none">·</span>
                    <span className="text-xs text-foreground-muted">
                      {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Date picker only when inside an account */}
          {insideAccount && (
            <div className="shrink-0">
              <DateRangePicker value={datePreset} onChange={setDatePreset} />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {currentLevel === "accounts" && (
          <AccountsList accounts={accounts} onSelect={handleSelectAccount} />
        )}
        {currentLevel === "account" && currentId && (
          <CampaignsView accountId={currentId} datePreset={datePreset} onSelectCampaign={handleSelectCampaign} />
        )}
        {currentLevel === "campaign" && currentId && (
          <AdSetsView campaignId={currentId} datePreset={datePreset} onSelectAdSet={handleSelectAdSet} />
        )}
        {currentLevel === "adset" && currentId && (
          <AdsView adSetId={currentId} datePreset={datePreset} />
        )}
      </div>
    </div>
  );
}
