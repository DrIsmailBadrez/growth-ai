export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  created_time: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  campaign_id: string;
  daily_budget: string;
  status: string;
  targeting: {
    age_min?: number;
    age_max?: number;
    geo_locations?: { countries?: string[] };
    flexible_spec?: Array<{ interests?: Array<{ id: string; name: string }> }>;
  };
  optimization_goal: string;
}

export interface MetaAd {
  id: string;
  name: string;
  adset_id: string;
  status: string;
  creative?: {
    id: string;
    thumbnail_url?: string;
    title?: string;
    body?: string;
  };
}

export interface MetaInsights {
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  date_start: string;
  date_stop: string;
}

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsightsFull {
  impressions: string;
  reach: string;
  frequency: string;
  clicks: string;
  unique_clicks: string;
  ctr: string;
  unique_ctr: string;
  spend: string;
  cpc: string;
  cpm: string;
  cpp: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
  conversions?: MetaAction[];
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  date_start: string;
  date_stop: string;
}

export interface MetaInsightsTimeSeries {
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  reach: string;
  date_start: string;
  date_stop: string;
}

export type DatePreset =
  | "today"
  | "yesterday"
  | "last_3d"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d"
  | "this_month"
  | "last_month";

export interface InsightParams {
  datePreset?: DatePreset;
  since?: string;
  until?: string;
}

export type DashboardLevel = "accounts" | "account" | "campaign" | "adset" | "ad";

export interface BreadcrumbItem {
  level: DashboardLevel;
  id: string;
  label: string;
}

export interface CarouselCard {
  imageHash: string;
  name: string;
  description: string;
  link?: string;
  callToAction?: string;
}

export interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}
