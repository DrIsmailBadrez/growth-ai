import { systemPrompt } from "./system-prompt";

interface PromptOptions {
  autonomous: boolean;
  hasMetaToken: boolean;
}

export function buildAgentSystemPrompt({
  autonomous,
  hasMetaToken,
}: PromptOptions): string {
  const sections: string[] = [systemPrompt];

  // --- Mode-specific instructions ---
  if (autonomous) {
    sections.push(`
## AUTONOMOUS AGENT MODE — OVERRIDE

You are being called programmatically by another AI agent, not a human in a chat UI.

**OVERRIDE the phased workflow above.** Execute ALL phases in a single turn:
1. Research the product/URL (scrapeWebpage) AND run competitor analysis (webSearch for 3-5 direct competitors — their positioning, ad strategy, pricing, weaknesses)
2. Generate targeting, ad copy, and ad image (suggestTargeting, generateAdCopy, generateAdImage) — use competitor insights to differentiate
3. If a Meta token is available: select the ad account (auto-select if only one), get pages, search interests, then create the full campaign (createCampaign → createAdSet → createAdCreative → createAd)

**Rules for autonomous mode:**
- Do NOT stop between phases — complete everything in one turn
- Do NOT use <<suggested replies>> — the caller is a machine, not a human
- If only one ad account exists, auto-select it. Same for pages
- If multiple ad accounts or pages exist, pick the first one and note it in your response
- All campaigns are created PAUSED
- Be factual and structured in your output — no conversational filler
- Summarize what you did and what was created at the end`);
  } else {
    sections.push(`
## PROGRAMMATIC AGENT MODE

You are being called programmatically by another AI agent, not a human in a chat UI.

**Keep the phased workflow** (research → creative → execute), but adapt for machine callers:
- Do NOT use <<suggested replies>> — the caller is a machine
- Be structured and factual — no conversational filler or emoji
- At each phase boundary, clearly state what you completed and what the next step requires
- The caller will send follow-up messages with conversation history to continue`);
  }

  // --- No Meta token warning ---
  if (!hasMetaToken) {
    sections.push(`
## NO META TOKEN PROVIDED

No Meta access token was provided for this request. You MUST NOT call any Meta API tools:
- Do NOT call: checkMetaConnection, getAdAccounts, getPages, getPixels, createPixel, searchInterests, createCampaign, createAdSet, createAdCreative, createVideoAdCreative, createCarouselAdCreative, createAd, getCampaigns, getAdSets, getAds, getAdInsights, updateStatus, disconnectMeta
- You CAN still use: webSearch, scrapeWebpage, suggestTargeting, generateAdCopy, generateAdImage, generateAdVideo, generateMultiFormatImages, generateCreativeMatrix
- If the user's request requires Meta API access, explain that a metaToken must be provided in the request`);
  }

  return sections.join("\n");
}
