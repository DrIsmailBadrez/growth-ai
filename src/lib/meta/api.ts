import type {
  MetaAdAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsights,
  MetaInsightsFull,
  MetaInsightsTimeSeries,
  InsightParams,
} from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

function log(label: string, data: unknown) {
  console.log(`[MetaAPI] ${label}:`, JSON.stringify(data, null, 2));
}

export class MetaAPI {
  constructor(private accessToken: string) {}

  /** Ensure ad account IDs always have the act_ prefix */
  private normalizeAdAccountId(id: string): string {
    return id.startsWith("act_") ? id : `act_${id}`;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${GRAPH_API_BASE}${endpoint}`;

    log(`${method} ${endpoint}`, { body: body ?? "(none)" });

    if (method === "GET") {
      const separator = endpoint.includes("?") ? "&" : "?";
      const getUrl = `${url}${separator}access_token=${this.accessToken.slice(0, 10)}...`;
      log("GET URL (truncated token)", getUrl);

      const fullUrl = `${url}${separator}access_token=${this.accessToken}`;
      const res = await fetch(fullUrl, { method: "GET" });
      return this.handleResponse<T>(res, endpoint);
    }

    // POST — form-encoded
    const form = new URLSearchParams();
    form.set("access_token", this.accessToken);

    if (body) {
      for (const [key, value] of Object.entries(body)) {
        if (value === undefined || value === null) continue;
        if (typeof value === "object") {
          form.set(key, JSON.stringify(value));
        } else {
          form.set(key, String(value));
        }
      }
    }

    log("POST form fields", Object.fromEntries(
      [...form.entries()].map(([k, v]) =>
        k === "access_token" ? [k, v.slice(0, 10) + "..."] : [k, v]
      )
    ));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    return this.handleResponse<T>(res, endpoint);
  }

  private async handleResponse<T>(res: Response, endpoint: string): Promise<T> {
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      log(`Response parse error for ${endpoint}`, { status: res.status, text: text.slice(0, 500) });
      throw new Error(`Meta API returned non-JSON: HTTP ${res.status}`);
    }

    log(`Response ${res.status} for ${endpoint}`, data);

    if (!res.ok) {
      const err = (data as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
      const msg = (err?.message as string) ?? `HTTP ${res.status}: ${res.statusText}`;
      const userMsg = err?.error_user_msg as string | undefined;
      const code = (err?.code as number) ?? res.status;
      throw new Error(`Meta API error (${code}): ${msg}${userMsg ? ` — ${userMsg}` : ""}`);
    }

    const obj = data as Record<string, unknown>;
    if (obj?.error) {
      const err = obj.error as Record<string, unknown>;
      const userMsg = err?.error_user_msg as string | undefined;
      throw new Error(
        `Meta API error (${err.code}): ${err.message}${userMsg ? ` — ${userMsg}` : ""}`
      );
    }

    return data as T;
  }

  // --- Read ---

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    const data = await this.request<{ data: MetaAdAccount[] }>(
      "/me/adaccounts?fields=id,name,account_id,account_status,currency"
    );
    return data.data ?? [];
  }

  async getPermissions(): Promise<Array<{ permission: string; status: string }>> {
    const data = await this.request<{
      data: Array<{ permission: string; status: string }>;
    }>("/me/permissions");
    return data.data ?? [];
  }

  async getPages(): Promise<Array<{ id: string; name: string; category: string }>> {
    const data = await this.request<{
      data: Array<{ id: string; name: string; category: string }>;
    }>("/me/accounts?fields=id,name,category");
    return data.data ?? [];
  }

  /**
   * Get pages that can be used for running ads on a specific ad account.
   */
  async getPromotePages(
    adAccountId: string
  ): Promise<Array<{ id: string; name: string }>> {
    const actId = this.normalizeAdAccountId(adAccountId);
    const data = await this.request<{
      data: Array<{ id: string; name: string }>;
    }>(`/${actId}/promote_pages?fields=id,name`);
    return data.data ?? [];
  }

  /**
   * Broad diagnostic: search all possible sources for pages.
   * Tries promote_pages on every ad account, /me/accounts, and business-owned pages.
   */
  async debugFindAllPages(
    adAccountIds: string[]
  ): Promise<Array<{ id: string; name: string; source: string }>> {
    const allPages: Array<{ id: string; name: string; source: string }> = [];
    const seen = new Set<string>();

    // 1. Try promote_pages on each ad account
    for (const actId of adAccountIds) {
      try {
        const pages = await this.getPromotePages(actId);
        for (const p of pages) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            allPages.push({ ...p, source: `promote_pages(${actId})` });
          }
        }
      } catch (e) {
        log(`promote_pages failed for ${actId}`, { error: String(e) });
      }
    }

    // 2. Try /me/accounts
    try {
      const userPages = await this.getPages();
      for (const p of userPages) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          allPages.push({ id: p.id, name: p.name, source: "/me/accounts" });
        }
      }
    } catch (e) {
      log("/me/accounts failed", { error: String(e) });
    }

    // 3. Try businesses → owned_pages
    try {
      const bizData = await this.request<{
        data: Array<{ id: string; name: string }>;
      }>("/me/businesses?fields=id,name");
      log("User businesses", bizData.data);

      for (const biz of bizData.data ?? []) {
        try {
          const bizPages = await this.request<{
            data: Array<{ id: string; name: string }>;
          }>(`/${biz.id}/owned_pages?fields=id,name`);
          for (const p of bizPages.data ?? []) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              allPages.push({ ...p, source: `business(${biz.name})` });
            }
          }
        } catch (e) {
          log(`owned_pages failed for business ${biz.id}`, { error: String(e) });
        }
      }
    } catch (e) {
      log("/me/businesses failed", { error: String(e) });
    }

    log("=== ALL PAGES FOUND ===", allPages);
    return allPages;
  }

  async getCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    const actId = this.normalizeAdAccountId(adAccountId);
    const data = await this.request<{ data: MetaCampaign[] }>(
      `/${actId}/campaigns?fields=id,name,objective,status,created_time,daily_budget,lifetime_budget`
    );
    return data.data ?? [];
  }

  async getAdSets(campaignId: string): Promise<MetaAdSet[]> {
    const data = await this.request<{ data: MetaAdSet[] }>(
      `/${campaignId}/adsets?fields=id,name,campaign_id,daily_budget,status,targeting,optimization_goal`
    );
    return data.data ?? [];
  }

  async getAds(adSetId: string): Promise<MetaAd[]> {
    const data = await this.request<{ data: MetaAd[] }>(
      `/${adSetId}/ads?fields=id,name,adset_id,status,creative{id,thumbnail_url,title,body}`
    );
    return data.data ?? [];
  }

  async getInsights(objectId: string): Promise<MetaInsights[]> {
    const data = await this.request<{ data: MetaInsights[] }>(
      `/${objectId}/insights?fields=impressions,clicks,spend,ctr`
    );
    return data.data ?? [];
  }

  private buildInsightParams(params?: InsightParams): string {
    if (!params) return "";
    const parts: string[] = [];
    if (params.datePreset) parts.push(`date_preset=${params.datePreset}`);
    if (params.since) parts.push(`time_range={"since":"${params.since}","until":"${params.until ?? params.since}"}`);
    return parts.length ? `&${parts.join("&")}` : "";
  }

  async getInsightsFull(objectId: string, params?: InsightParams): Promise<MetaInsightsFull | null> {
    const fields = [
      "impressions", "reach", "frequency", "clicks", "unique_clicks",
      "ctr", "unique_ctr", "spend", "cpc", "cpm", "cpp",
      "actions", "cost_per_action_type", "conversions",
      "quality_ranking", "engagement_rate_ranking", "conversion_rate_ranking",
      "date_start", "date_stop",
    ].join(",");
    const extra = this.buildInsightParams(params);
    const data = await this.request<{ data: MetaInsightsFull[] }>(
      `/${objectId}/insights?fields=${fields}${extra}`
    );
    return data.data?.[0] ?? null;
  }

  async getInsightsTimeSeries(objectId: string, params?: InsightParams): Promise<MetaInsightsTimeSeries[]> {
    const fields = "impressions,clicks,spend,ctr,cpc,reach,date_start,date_stop";
    const extra = this.buildInsightParams(params);
    const data = await this.request<{ data: MetaInsightsTimeSeries[] }>(
      `/${objectId}/insights?fields=${fields}&time_increment=1${extra}`
    );
    return data.data ?? [];
  }

  private async requestAllPages<T>(endpoint: string): Promise<T[]> {
    let all: T[] = [];
    let url = `${GRAPH_API_BASE}${endpoint}`;
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}access_token=${this.accessToken}&limit=200`;

    while (url) {
      const res = await fetch(url, { method: "GET" });
      const data = await this.handleResponse<{ data: T[]; paging?: { next?: string } }>(res, endpoint);
      all = all.concat(data.data ?? []);
      url = data.paging?.next ?? "";
    }
    return all;
  }

  async getCampaignsPaginated(adAccountId: string): Promise<MetaCampaign[]> {
    const actId = this.normalizeAdAccountId(adAccountId);
    return this.requestAllPages<MetaCampaign>(
      `/${actId}/campaigns?fields=id,name,objective,status,created_time,daily_budget,lifetime_budget`
    );
  }

  async getAdSetsPaginated(campaignId: string): Promise<MetaAdSet[]> {
    return this.requestAllPages<MetaAdSet>(
      `/${campaignId}/adsets?fields=id,name,campaign_id,daily_budget,status,targeting,optimization_goal`
    );
  }

  async getAdsPaginated(adSetId: string): Promise<MetaAd[]> {
    return this.requestAllPages<MetaAd>(
      `/${adSetId}/ads?fields=id,name,adset_id,status,creative{id,thumbnail_url,title,body}`
    );
  }

  // --- Pixels ---

  async getPixels(
    adAccountId: string
  ): Promise<Array<{ id: string; name: string; last_fired_time?: string; is_created_by_business?: boolean }>> {
    const actId = this.normalizeAdAccountId(adAccountId);
    const data = await this.request<{
      data: Array<{ id: string; name: string; last_fired_time?: string; is_created_by_business?: boolean }>;
    }>(`/${actId}/adspixels?fields=id,name,last_fired_time,is_created_by_business`);
    return data.data ?? [];
  }

  async createPixel(
    adAccountId: string,
    name: string
  ): Promise<{ id: string }> {
    const actId = this.normalizeAdAccountId(adAccountId);
    return this.request<{ id: string }>(`/${actId}/adspixels`, "POST", { name });
  }

  async getPixelCode(pixelId: string): Promise<string> {
    const data = await this.request<{ id: string; code: string }>(
      `/${pixelId}?fields=id,code`
    );
    return data.code;
  }

  // --- Targeting Search ---

  async searchInterests(
    query: string
  ): Promise<Array<{ id: string; name: string; audience_size_lower_bound: number; audience_size_upper_bound: number }>> {
    const data = await this.request<{
      data: Array<{
        id: string;
        name: string;
        audience_size_lower_bound: number;
        audience_size_upper_bound: number;
      }>;
    }>(`/search?type=adinterest&q=${encodeURIComponent(query)}`);
    return data.data ?? [];
  }

  // --- Create ---

  async createCampaign(
    adAccountId: string,
    params: {
      name: string;
      objective: string;
      status: string;
      dailyBudget?: number;
    }
  ): Promise<{ id: string }> {
    const actId = this.normalizeAdAccountId(adAccountId);
    const body: Record<string, unknown> = {
      name: params.name,
      objective: params.objective,
      status: params.status,
      special_ad_categories: [],
    };

    if (params.dailyBudget) {
      // CBO: budget at campaign level
      body.daily_budget = params.dailyBudget;
    } else {
      // ABO: budget at ad set level — Meta requires this field
      body.is_adset_budget_sharing_enabled = false;
    }

    return this.request<{ id: string }>(
      `/${actId}/campaigns`,
      "POST",
      body
    );
  }

  async createAdSet(
    adAccountId: string,
    params: {
      campaignId: string;
      name: string;
      dailyBudget: number;
      optimizationGoal: string;
      countries: string[];
      ageMin: number;
      ageMax: number;
      interests?: Array<{ id: string; name: string }>;
      billingEvent: string;
      bidAmount?: number;
      promotedObject?: Record<string, string>;
      status: string;
    }
  ): Promise<{ id: string }> {
    const targeting: Record<string, unknown> = {
      age_min: params.ageMin,
      age_max: params.ageMax,
      geo_locations: { countries: params.countries },
    };

    if (params.interests?.length) {
      targeting.flexible_spec = [{ interests: params.interests }];
    }

    // Meta requires advantage_audience flag on all ad sets.
    // Advantage+ (1) requires age_max=65 — Meta treats age/gender as suggestions, not constraints.
    // If user wants a specific age range (age_max < 65), use manual targeting (0).
    const useAdvantageAudience = params.ageMax >= 65 && params.ageMin <= 18;
    targeting.targeting_automation = {
      advantage_audience: useAdvantageAudience ? 1 : 0,
    };

    const startTime = new Date();
    startTime.setUTCDate(startTime.getUTCDate() + 1);
    startTime.setUTCHours(0, 0, 0, 0);

    const actId = this.normalizeAdAccountId(adAccountId);
    const body: Record<string, unknown> = {
      campaign_id: params.campaignId,
      name: params.name,
      daily_budget: params.dailyBudget,
      optimization_goal: params.optimizationGoal,
      targeting,
      billing_event: params.billingEvent,
      status: params.status,
      start_time: startTime.toISOString(),
    };

    if (params.bidAmount) {
      body.bid_amount = params.bidAmount;
      body.bid_strategy = "LOWEST_COST_WITH_BID_CAP";
    } else {
      // Explicitly set lowest cost strategy so Meta doesn't require a bid amount
      body.bid_strategy = "LOWEST_COST_WITHOUT_CAP";
    }
    if (params.promotedObject) {
      body.promoted_object = params.promotedObject;
    }

    return this.request<{ id: string }>(`/${actId}/adsets`, "POST", body);
  }

  /**
   * Upload an image to Meta's ad images library.
   * Tries local cache first (for generated images),
   * then falls back to downloading from the URL.
   * Returns the image_hash needed for ad creatives.
   */
  async uploadImageFromUrl(
    adAccountId: string,
    imageUrl: string,
    localPath?: string
  ): Promise<string> {
    const actId = this.normalizeAdAccountId(adAccountId);

    let imageBuffer: Buffer | null = null;

    // Try local cache first (images are cached when generated)
    if (localPath) {
      try {
        const { getCachedImage } = await import("@/lib/ai/creative");
        imageBuffer = getCachedImage(localPath);
        if (imageBuffer) {
          log("Using cached image", { localPath, size: imageBuffer.length });
        }
      } catch {
        // ignore cache miss
      }
    }

    // Fall back to downloading from URL
    if (!imageBuffer) {
      log("Downloading image for upload", { url: imageUrl.slice(0, 100) + "..." });
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        throw new Error(
          `Failed to download image: HTTP ${imageRes.status}. ` +
          `The image URL may have expired. Try regenerating the image with generateAdImage.`
        );
      }
      imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    }

    const base64Image = imageBuffer.toString("base64");

    log("Uploading image to Meta", { size: imageBuffer.length, adAccountId: actId });

    // Upload to Meta using the bytes field (base64-encoded)
    const url = `${GRAPH_API_BASE}/${actId}/adimages`;
    const form = new URLSearchParams();
    form.set("access_token", this.accessToken);
    form.set("bytes", base64Image);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const data = await res.json() as Record<string, unknown>;
    log("Image upload response", data);

    if (!res.ok || data.error) {
      const err = data.error as Record<string, unknown> | undefined;
      throw new Error(
        `Image upload failed: ${err?.message ?? `HTTP ${res.status}`}`
      );
    }

    // Response shape: { images: { "bytes": { hash: "abc123", ... } } }
    const images = data.images as Record<string, { hash: string }> | undefined;
    if (!images) {
      throw new Error("Image upload returned no images object");
    }
    const firstImage = Object.values(images)[0];
    if (!firstImage?.hash) {
      throw new Error("Image upload returned no hash");
    }

    log("Image uploaded successfully", { hash: firstImage.hash });
    return firstImage.hash;
  }

  async createAdCreative(
    adAccountId: string,
    params: {
      name: string;
      pageId: string;
      imageHash: string;
      primaryText: string;
      headline: string;
      description: string;
      callToAction: string;
      linkUrl: string;
    }
  ): Promise<{ id: string }> {
    const actId = this.normalizeAdAccountId(adAccountId);
    return this.request<{ id: string }>(
      `/${actId}/adcreatives`,
      "POST",
      {
        name: params.name,
        object_story_spec: {
          page_id: params.pageId,
          link_data: {
            image_hash: params.imageHash,
            message: params.primaryText,
            name: params.headline,
            description: params.description,
            link: params.linkUrl,
            call_to_action: {
              type: params.callToAction,
              value: { link: params.linkUrl },
            },
          },
        },
      }
    );
  }

  async createAd(
    adAccountId: string,
    params: {
      name: string;
      adSetId: string;
      creativeId: string;
      status: string;
    }
  ): Promise<{ id: string }> {
    const actId = this.normalizeAdAccountId(adAccountId);
    return this.request<{ id: string }>(`/${actId}/ads`, "POST", {
      name: params.name,
      adset_id: params.adSetId,
      creative: { creative_id: params.creativeId },
      status: params.status,
    });
  }

  // --- Update ---

  /**
   * Update the status of any Meta Ads object (campaign, ad set, or ad).
   * The Graph API uses the same POST /{id} endpoint for all three.
   */
  async updateStatus(
    objectId: string,
    status: "ACTIVE" | "PAUSED" | "ARCHIVED"
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/${objectId}`, "POST", { status });
  }

  /** @deprecated Use updateStatus instead */
  async updateAdStatus(
    adId: string,
    status: "ACTIVE" | "PAUSED"
  ): Promise<{ success: boolean }> {
    return this.updateStatus(adId, status);
  }
}
