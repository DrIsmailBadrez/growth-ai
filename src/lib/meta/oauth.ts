const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

const SCOPES = [
  "ads_management",
  "ads_read",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

export function buildMetaOAuthUrl(): { url: string; state: string } {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    scope: SCOPES,
    response_type: "code",
    state,
  });

  return {
    url: `https://www.facebook.com/v21.0/dialog/oauth?${params}`,
    state,
  };
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  // Exchange code for short-lived token
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  });

  const res = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?${params}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  // Exchange for long-lived token (~60 days)
  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: data.access_token,
  });

  const longRes = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?${longLivedParams}`
  );
  const longData = await longRes.json();

  if (longData.error) {
    throw new Error(longData.error.message);
  }

  return longData.access_token;
}
