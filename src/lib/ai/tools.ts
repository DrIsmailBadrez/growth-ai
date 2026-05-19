import { tool } from "ai";
import { z } from "zod";
import {
  generateImageMultiModel,
  generateMultiFormat,
  generateVideo,
  generateTextToVideo,
  generateCreativeMatrix,
} from "./creative";
import { getCachedAsset } from "./asset-cache";
import { buildPrompt, buildVideoPrompt, getAvailableStyles } from "./prompt-engine";
import { searchWeb, scrapeUrl } from "./web-search";
import { getMetaToken, clearMetaToken } from "@/lib/session";
import { MetaAPI } from "@/lib/meta/api";
import type { ImageModel, VideoModel, AspectRatio } from "./creative-types";
import { selectModel } from "./model-router";

// --- Web Research Tools ---

export const webSearch = tool({
  description:
    "Search the web for information about products, competitors, markets, or any topic. Use this to research before generating ads.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .describe("Maximum number of results to return (default 5)"),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      const results = await searchWeb(query, { maxResults });
      return { type: "web_search_results" as const, results };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const scrapeWebpage = tool({
  description:
    "Extract content from a specific URL. Use this when the user provides a website to analyze before creating ads.",
  inputSchema: z.object({
    url: z.string().describe("The URL to scrape"),
  }),
  execute: async ({ url }) => {
    try {
      const result = await scrapeUrl(url);
      return {
        type: "webpage_content" as const,
        url: result.url,
        title: result.title,
        content: result.content,
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Webpage scrape failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// --- AI Creative Tools (work without Meta account) ---

export const suggestTargeting = tool({
  description:
    "Suggest audience targeting based on the user's product, goals, and budget. Returns targeting recommendations with reasoning. This uses AI reasoning, not Meta API.",
  inputSchema: z.object({
    product: z.string().describe("The product or service being advertised"),
    goals: z
      .string()
      .describe("Campaign goals (e.g., traffic, sales, awareness)"),
    budget: z.string().optional().describe("Daily or lifetime budget"),
    additionalContext: z
      .string()
      .optional()
      .describe("Any extra context about the target audience"),
  }),
  execute: async ({ product, goals, budget, additionalContext }) => {
    return {
      type: "targeting_suggestion" as const,
      input: { product, goals, budget, additionalContext },
      instruction: `Based on these inputs, provide structured targeting recommendations. Think like an elite media buyer:

**Audience Analysis:**
1. Identify the awareness level of the target audience (Unaware → Most Aware)
2. Define the ideal customer profile (demographics, psychographics, behaviors)

**Targeting Recommendations:**
- Countries (ISO codes)
- Age range (ageMin, ageMax) with reasoning
- Interests: List specific Meta interest categories (be precise — "Digital marketing" not "Business")
- Optimization goal: LINK_CLICKS, IMPRESSIONS, LEAD_GENERATION, CONVERSIONS, REACH
- Campaign objective: OUTCOME_TRAFFIC, OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES

**Campaign Structure Recommendation:**
- Campaign type: ABO (testing) or CBO (scaling) and why
- Recommended daily budget with reasoning
- Whether to use Advantage+ broad targeting or manual interest stacking
- Estimated audience size assessment

**Strategy Note:**
- In 2025-2026, broad targeting often outperforms manual interest stacks due to Meta's Andromeda AI
- Recommend the 70/20/10 split: 70% broad, 20% retargeting, 10% interest testing when applicable
- Need 50 conversions/week per ad set to exit learning phase — factor this into budget recommendations`,
    };
  },
});

export const generateAdCopy = tool({
  description:
    "Generate ad copy including primary text, headline, description, and call-to-action. The AI crafts compelling copy based on the product and goals.",
  inputSchema: z.object({
    product: z.string().describe("The product or service being advertised"),
    targetAudience: z.string().describe("Who the ad is targeting"),
    tone: z
      .string()
      .optional()
      .describe("Desired tone (e.g., professional, playful, urgent)"),
    keyBenefits: z
      .string()
      .optional()
      .describe("Key benefits or selling points to highlight"),
    awarenessLevel: z
      .enum(["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"])
      .optional()
      .describe("Schwartz awareness level of the target audience"),
  }),
  execute: async ({ product, targetAudience, tone, keyBenefits, awarenessLevel }) => {
    return {
      type: "ad_copy_request" as const,
      input: { product, targetAudience, tone, keyBenefits, awarenessLevel },
      instruction: `Generate 3-5 ad copy variations, each using a DIFFERENT copywriting framework. Think like an elite direct-response copywriter.

**Character Limits (STRICT):**
- Primary text: Front-load the hook in first 80-100 chars. Only ~125 chars visible before "See More"
- Headline: 27-40 characters MAX
- Description: 25 characters MAX

**For EACH variation, generate:**
- Framework used (PAS, AIDA, BAB, Social Proof, Curiosity Gap, Direct Offer, or Story Hook)
- primaryText: The main ad copy. Must contain a specific promise/benefit. Write conversationally — sound like a smart friend, not a brand
- headline: Ultra-concise, attention-grabbing. Use formulas: [Benefit + Timeframe], [Action + Value], [Social Proof], [Curiosity], or [Urgency + Action]
- description: Short supporting text (25 chars max)
- callToAction: One of SHOP_NOW, LEARN_MORE, SIGN_UP, BOOK_NOW, CONTACT_US, GET_OFFER, SUBSCRIBE

**Required Variations:**
1. **PAS (Pain-Agitate-Solution)**: Name a specific pain, intensify the emotional weight, present product as the resolution
2. **Social Proof Lead**: Open with a customer result, testimonial, or specific number ("10,000+ customers...")
3. **Curiosity Gap**: Create an open loop that demands resolution ("The #1 reason [audience] struggle with...")
4. **Direct Offer**: Lead with the concrete benefit + any incentive/discount
5. **Story Hook**: Start with "I used to [relatable struggle]..." or a mini-narrative

**Rules:**
- Every variation must contain a SPECIFIC promise (not vague). "Save 3 hours/week" > "Save time"
- Use "you" and "your" — never corporate third person
- 1-3 emojis max per variation. Use ✅ for benefits, ➡️ for key points, 🔥 for urgency
- One clear CTA per variation. Power words: Get, Start, Join, Discover, Shop, Try
- Match copy intensity to awareness level: Unaware = educational/curiosity, Most Aware = offer/urgency`,
    };
  },
});

export const generateAdImage = tool({
  description:
    "Generate an ad image using AI. Creates a scroll-stopping ad visual optimized for Meta feeds. " +
    "Supports multiple image models: flux-2-pro (default, best quality), imagen-4-ultra (photorealism), ideogram-3 (text in image), gpt-image-1 (fallback). " +
    "Use built-in style keys for maximum creative diversity: hero-lifestyle, product-studio, ugc-authentic, bold-graphic, before-after, macro-texture. " +
    "Or pass a custom style description.",
  inputSchema: z.object({
    product: z.string().describe(
      "A VISUAL DESCRIPTION of the product — NOT just the brand name. " +
      "The image model has zero context about what the product is. " +
      "GOOD: 'Societiz — a mobile app for creator communities, showing a sleek dashboard on a phone screen with member avatars and engagement metrics'. " +
      "BAD: 'Societiz'. " +
      "Include: what it looks like physically, what category it's in, key visual elements."
    ),
    style: z
      .string()
      .optional()
      .describe(
        "Built-in style key (hero-lifestyle, product-studio, ugc-authentic, bold-graphic, before-after, macro-texture) " +
        "OR a custom style description (e.g., 'editorial fashion shot in a white loft space'). " +
        "Built-in styles enforce conflicting composition constraints for genuine diversity."
      ),
    mood: z
      .string()
      .optional()
      .describe("Override the emotional mood (e.g., 'bold and energetic', 'calm and premium', 'raw and gritty')"),
    targetEmotion: z
      .string()
      .optional()
      .describe("What should the viewer FEEL? (e.g., 'desire', 'FOMO', 'relief', 'curiosity', 'belonging')"),
    hero: z
      .enum(["product", "person", "transformation", "problem"])
      .optional()
      .describe("Who/what is the hero of this image? product = the object itself, person = human using it, transformation = the result, problem = the pain point"),
    aspectRatio: z
      .enum(["1:1", "4:5", "9:16"])
      .optional()
      .describe("'1:1' square (feed default), '4:5' portrait (feed, highest real estate), '9:16' vertical (stories/reels)"),
    model: z
      .enum(["gpt-image-1", "flux-2-pro", "ideogram-3", "imagen-4-ultra"])
      .optional()
      .describe("Image model. Default: auto-selected based on context"),
    needsTextInImage: z
      .boolean()
      .optional()
      .describe("Set true if the image needs readable text/typography — selects Ideogram 3"),
    needsPhotorealism: z
      .boolean()
      .optional()
      .describe("Set true for ultra-realistic photography — selects Imagen 4 Ultra"),
    isProductShot: z
      .boolean()
      .optional()
      .describe("Set true for clean product shots — selects FLUX 2 Pro"),
  }),
  execute: async ({ product, style, mood, targetEmotion, hero, aspectRatio, model, needsTextInImage, needsPhotorealism, isProductShot }) => {
    try {
      const ratio: AspectRatio = aspectRatio ?? "1:1";

      console.log("[generateAdImage] === TOOL EXECUTE START ===");
      console.log(`[generateAdImage]   Inputs: product=${product}, style=${style}, mood=${mood}, model=${model}, ratio=${ratio}`);
      console.log(`[generateAdImage]   Flags: needsTextInImage=${needsTextInImage}, needsPhotorealism=${needsPhotorealism}, isProductShot=${isProductShot}`);

      // Select the best available model via the model router
      const selectedModel: ImageModel = selectModel({
        requestedModel: model as ImageModel | undefined,
        needsTextInImage,
        needsPhotorealism,
        isProductShot,
      });
      console.log(`[generateAdImage]   selectModel returned: ${selectedModel}`);

      // Build a model-optimized prompt via the prompt engine
      const prompt = buildPrompt(
        { product, style, mood, targetEmotion, hero },
        selectedModel,
        ratio
      );
      console.log(`[generateAdImage]   buildPrompt returned (first 150 chars): ${prompt.slice(0, 150)}...`);

      console.log(`[generateAdImage]   Calling generateImageMultiModel with requestedModel=${model}`);
      const result = await generateImageMultiModel(prompt, ratio, {
        requestedModel: model as ImageModel | undefined,
        needsTextInImage,
        needsPhotorealism,
        isProductShot,
      });
      console.log(`[generateAdImage]   Result: model=${result.model}, url=${result.url}`);

      return {
        type: "generated_image" as const,
        url: result.url,
        localPath: result.localPath,
        revisedPrompt: result.revisedPrompt ?? prompt,
        originalPrompt: prompt,
        model: result.model,
        aspectRatio: result.aspectRatio,
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// --- Meta Connection Tools ---

export const checkMetaConnection = tool({
  description: "Check if the user has connected their Meta (Facebook) ad account.",
  inputSchema: z.object({}),
  execute: async () => {
    const token = await getMetaToken();
    return {
      type: "meta_connection" as const,
      connected: !!token,
      message: token
        ? "Meta account is connected."
        : "Meta account is not connected. Please click the 'Connect Meta Account' button to link your account.",
    };
  },
});

export const disconnectMeta = tool({
  description:
    "Disconnect the currently linked Meta (Facebook) ad account. Clears the stored access token. Use when the user wants to disconnect, switch accounts, or re-authenticate.",
  inputSchema: z.object({}),
  execute: async () => {
    const token = await getMetaToken();
    if (!token) {
      return {
        type: "meta_disconnected" as const,
        message: "No Meta account is currently connected.",
      };
    }
    await clearMetaToken();
    return {
      type: "meta_disconnected" as const,
      message: "Meta account has been disconnected. You can now connect a different account.",
    };
  },
});

export const getPages = tool({
  description:
    "Get Facebook Pages available for running ads. If adAccountId is provided, returns pages promotable through that specific ad account (more reliable). Otherwise falls back to the user's own pages. A Page is required to run ads. Call this AFTER the user selects an ad account.",
  inputSchema: z.object({
    adAccountId: z
      .string()
      .optional()
      .describe(
        "The ad account ID (e.g., act_123456). When provided, returns pages that can run ads through this account. Strongly recommended."
      ),
  }),
  execute: async ({ adAccountId }) => {
    const token = await getMetaToken();
    if (!token) {
      return { type: "error" as const, message: "Meta account not connected." };
    }
    try {
      const api = new MetaAPI(token);

      // Prefer ad-account-specific pages — works even when /me/accounts is empty
      if (adAccountId) {
        const pages = await api.getPromotePages(adAccountId);
        if (pages.length > 0) {
          return { type: "pages" as const, pages };
        }
      }

      // Fallback to user's own pages
      const userPages = await api.getPages();
      if (userPages.length > 0) {
        return { type: "pages" as const, pages: userPages };
      }

      // Both methods returned empty — run full diagnostic across ALL sources
      console.log("[getPages] Primary methods returned empty. Running full diagnostic...");
      const accounts = await api.getAdAccounts();
      const adAccountIds = accounts.map((a) => a.id);
      const allPages = await api.debugFindAllPages(adAccountIds);

      if (allPages.length > 0) {
        return {
          type: "pages" as const,
          pages: allPages.map((p) => ({ id: p.id, name: p.name, source: p.source })),
        };
      }

      return {
        type: "pages" as const,
        pages: [],
        message:
          "No Facebook Pages found across any source (promote_pages, /me/accounts, business pages). " +
          "This usually means the Meta token doesn't have page access. " +
          "Try reconnecting with pages_manage_ads and pages_read_engagement permissions, " +
          "and make sure to select your Page during the Facebook login flow.",
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to fetch pages: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const searchInterests = tool({
  description:
    "Search Meta's targeting database for valid interest IDs. MUST be called before creating an ad set with interest targeting. Never guess interest IDs — always look them up with this tool first.",
  inputSchema: z.object({
    queries: z
      .array(z.string())
      .describe(
        "List of interest keywords to search for (e.g., ['social media', 'digital marketing', 'fitness'])"
      ),
  }),
  execute: async ({ queries }) => {
    const token = await getMetaToken();
    if (!token) {
      return { type: "error" as const, message: "Meta account not connected." };
    }
    try {
      const api = new MetaAPI(token);
      const results: Array<{
        query: string;
        interests: Array<{
          id: string;
          name: string;
          audience_size_lower_bound: number;
          audience_size_upper_bound: number;
        }>;
      }> = [];

      for (const query of queries) {
        const interests = await api.searchInterests(query);
        results.push({ query, interests: interests.slice(0, 5) });
      }

      return { type: "interest_search" as const, results };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Interest search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const getPixels = tool({
  description:
    "Fetch Meta Pixels for an ad account. Call this when creating conversion/sales campaigns to check if a pixel exists. If pixels exist, ask the user which one to use. If none exist, offer to create one.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
  }),
  execute: async ({ adAccountId }) => {
    const token = await getMetaToken();
    if (!token) {
      return { type: "error" as const, message: "Meta account not connected." };
    }
    try {
      const api = new MetaAPI(token);
      const pixels = await api.getPixels(adAccountId);
      return {
        type: "pixels" as const,
        pixels,
        message: pixels.length
          ? `Found ${pixels.length} pixel(s).`
          : "No pixels found on this ad account. A pixel is needed for conversion tracking. Offer to create one.",
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to fetch pixels: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const createPixel = tool({
  description:
    "Create a new Meta Pixel on an ad account. ONLY call this after getPixels returned zero pixels. If a pixel already exists, use it instead of creating a new one.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
    name: z.string().describe("Name for the pixel (e.g., 'Societiz Pixel')"),
  }),
  execute: async ({ adAccountId, name }) => {
    const token = await getMetaToken();
    if (!token) {
      return { type: "error" as const, message: "Meta account not connected." };
    }
    try {
      const api = new MetaAPI(token);

      // Guard: check if a pixel already exists before trying to create
      const existing = await api.getPixels(adAccountId);
      if (existing.length > 0) {
        return {
          type: "pixels" as const,
          pixels: existing,
          message: `A pixel already exists on this account. Use "${existing[0].name}" (ID: ${existing[0].id}) instead of creating a new one.`,
        };
      }

      const result = await api.createPixel(adAccountId, name);

      // Fetch the pixel code snippet for installation
      let code = "";
      try {
        code = await api.getPixelCode(result.id);
      } catch {
        // code fetch may fail if not immediately available
      }

      return {
        type: "pixel_created" as const,
        id: result.id,
        name,
        code,
        message: code
          ? `Pixel created (ID: ${result.id}). Install the code snippet on your website's <head> tag to start tracking.`
          : `Pixel created (ID: ${result.id}). Go to Events Manager in Meta Business Suite to get the installation code.`,
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to create pixel: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const getAdAccounts = tool({
  description: "Get the user's Meta ad accounts.",
  inputSchema: z.object({}),
  execute: async () => {
    const token = await getMetaToken();
    if (!token) {
      return { type: "error" as const, message: "Meta account not connected." };
    }
    try {
      const api = new MetaAPI(token);
      const accounts = await api.getAdAccounts();
      return { type: "ad_accounts" as const, accounts };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to fetch ad accounts: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// --- Meta Create Tools ---

export const createCampaign = tool({
  description: "Create a Meta ad campaign with a given objective. Campaigns are always created in PAUSED status.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID (e.g., act_123456)"),
    name: z.string().describe("Campaign name"),
    objective: z
      .enum([
        "OUTCOME_TRAFFIC",
        "OUTCOME_AWARENESS",
        "OUTCOME_ENGAGEMENT",
        "OUTCOME_LEADS",
        "OUTCOME_SALES",
      ])
      .describe("Campaign objective"),
  }),
  execute: async ({ adAccountId, name, objective }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const result = await api.createCampaign(adAccountId, { name, objective, status: "PAUSED" });
      const needsPixel = objective === "OUTCOME_SALES" || objective === "OUTCOME_LEADS";
      return {
        type: "campaign_created" as const,
        ...result,
        ...(needsPixel && {
          requires_pixel: true,
          warning:
            `IMPORTANT: ${objective} campaigns require a Meta Pixel for conversion tracking. ` +
            "You MUST call getPixels to find an existing pixel (or createPixel if none exist) " +
            "and include { pixel_id, custom_event_type } in every ad set's promotedObject. " +
            "Ad creation WILL FAIL without this.",
        }),
      };
    } catch (error) {
      return { type: "error" as const, message: `Failed to create campaign: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

/**
 * Billing event is almost always IMPRESSIONS.
 * Only LINK_CLICKS optimization with explicit CPC billing uses LINK_CLICKS,
 * but that requires a bid_amount — so we default to IMPRESSIONS always.
 * The agent can override to LINK_CLICKS via the billingEvent param if user wants CPC.
 */

export const createAdSet = tool({
  description:
    "Create a Meta ad set with budget, targeting, and schedule. " +
    "CRITICAL: If optimizationGoal is OFFSITE_CONVERSIONS or VALUE, you MUST include promotedObject: { pixel_id: '...', custom_event_type: 'PURCHASE' }. " +
    "If LEAD_GENERATION, you MUST include promotedObject: { page_id: '...' }. " +
    "The call WILL FAIL without it. Interest IDs MUST come from searchInterests — never guess them.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
    campaignId: z.string().describe("The parent campaign ID"),
    name: z.string().describe("Ad set name"),
    dailyBudget: z.number().describe("Daily budget in cents (e.g., 1500 = $15.00)"),
    optimizationGoal: z
      .enum([
        "LINK_CLICKS",
        "LANDING_PAGE_VIEWS",
        "IMPRESSIONS",
        "REACH",
        "AD_RECALL_LIFT",
        "LEAD_GENERATION",
        "QUALITY_LEAD",
        "OFFSITE_CONVERSIONS",
        "CONVERSATIONS",
        "VALUE",
        "APP_INSTALLS",
        "POST_ENGAGEMENT",
        "PAGE_LIKES",
        "EVENT_RESPONSES",
        "THRUPLAY",
        "TWO_SECOND_CONTINUOUS_VIDEO_VIEWS",
      ])
      .describe(
        "What to optimize for based on the user's goal:\n" +
        "- Traffic → LINK_CLICKS or LANDING_PAGE_VIEWS\n" +
        "- Leads / sign-ups → LEAD_GENERATION (needs promoted_object with page_id)\n" +
        "- Sales / purchases / conversions → OFFSITE_CONVERSIONS (needs promoted_object with pixel_id)\n" +
        "- Maximize purchase value / ROAS → VALUE (needs promoted_object with pixel_id)\n" +
        "- Brand awareness / reach → REACH or AD_RECALL_LIFT\n" +
        "- Video views → THRUPLAY\n" +
        "- Engagement → POST_ENGAGEMENT or PAGE_LIKES\n" +
        "- App downloads → APP_INSTALLS\n" +
        "- WhatsApp / Messenger → CONVERSATIONS"
      ),
    billingEvent: z
      .enum(["IMPRESSIONS", "LINK_CLICKS"])
      .optional()
      .describe(
        "How to bill. Default IMPRESSIONS (CPM). Only use LINK_CLICKS for CPC billing — requires bidAmount."
      ),
    bidAmount: z
      .number()
      .optional()
      .describe("Bid cap in cents. REQUIRED if billingEvent is LINK_CLICKS. E.g., 50 = $0.50 per click."),
    promotedObject: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Required for certain optimization goals:\n" +
        "- LEAD_GENERATION → { page_id: '...' }\n" +
        "- OFFSITE_CONVERSIONS → { pixel_id: '...', custom_event_type: 'PURCHASE' }\n" +
        "- VALUE → { pixel_id: '...', custom_event_type: 'PURCHASE' }\n" +
        "- APP_INSTALLS → { application_id: '...', object_store_url: '...' }"
      ),
    countries: z.array(z.string()).describe("Target countries (ISO codes, e.g., ['US'])"),
    ageMin: z.number().optional().describe("Minimum age (default 18)"),
    ageMax: z.number().optional().describe("Maximum age (default 65)"),
    interests: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .optional()
      .describe("Interest targeting — IDs MUST come from searchInterests tool"),
  }),
  execute: async ({
    adAccountId,
    campaignId,
    name,
    dailyBudget,
    optimizationGoal,
    billingEvent,
    bidAmount,
    promotedObject,
    countries,
    ageMin,
    ageMax,
    interests,
  }) => {
    // Fail fast: these optimization goals REQUIRE a promoted_object
    const NEEDS_PROMOTED_OBJECT: Record<string, string> = {
      OFFSITE_CONVERSIONS: "pixel_id (and custom_event_type)",
      VALUE: "pixel_id (and custom_event_type)",
      LEAD_GENERATION: "page_id",
      APP_INSTALLS: "application_id (and object_store_url)",
    };
    if (NEEDS_PROMOTED_OBJECT[optimizationGoal] && !promotedObject) {
      return {
        type: "error" as const,
        message: `promoted_object is REQUIRED for ${optimizationGoal}. You must include: ${NEEDS_PROMOTED_OBJECT[optimizationGoal]}. Call getPixels first to get the pixel_id, or use the page_id from getPages.`,
      };
    }

    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const result = await api.createAdSet(adAccountId, {
        campaignId,
        name,
        dailyBudget,
        optimizationGoal,
        countries,
        ageMin: ageMin ?? 18,
        ageMax: ageMax ?? 65,
        interests,
        billingEvent: billingEvent ?? "IMPRESSIONS",
        bidAmount,
        promotedObject,
        status: "PAUSED",
      });
      return { type: "adset_created" as const, ...result };
    } catch (error) {
      return { type: "error" as const, message: `Failed to create ad set: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

export const createAdCreative = tool({
  description:
    "Create a Meta ad creative with copy and image. The image URL is automatically uploaded to Meta's ad images library first, then the creative is created with the image hash.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
    name: z.string().describe("Creative name"),
    pageId: z.string().describe("Facebook Page ID to use"),
    imageUrl: z.string().describe("URL of the image to use (will be uploaded to Meta automatically)"),
    imageLocalPath: z
      .string()
      .optional()
      .describe("Local cache path from generateAdImage result (localPath field). Pass this to avoid expired URL issues."),
    primaryText: z.string().describe("Primary text (main message)"),
    headline: z.string().describe("Headline text"),
    description: z.string().describe("Description text"),
    callToAction: z
      .enum(["SHOP_NOW", "LEARN_MORE", "SIGN_UP", "BOOK_NOW", "CONTACT_US", "GET_OFFER", "SUBSCRIBE", "DOWNLOAD", "GET_QUOTE", "APPLY_NOW", "ORDER_NOW", "SEND_MESSAGE", "WHATSAPP_MESSAGE"])
      .describe("Call-to-action button type"),
    linkUrl: z.string().describe("Destination URL when ad is clicked"),
  }),
  execute: async ({
    adAccountId,
    name,
    pageId,
    imageUrl,
    imageLocalPath,
    primaryText,
    headline,
    description,
    callToAction,
    linkUrl,
  }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);

      // Step 1: Upload image to Meta and get image_hash (uses local cache if available)
      const imageHash = await api.uploadImageFromUrl(adAccountId, imageUrl, imageLocalPath);

      // Step 2: Create creative with the image hash
      const result = await api.createAdCreative(adAccountId, {
        name,
        pageId,
        imageHash,
        primaryText,
        headline,
        description,
        callToAction,
        linkUrl,
      });
      return { type: "creative_created" as const, ...result };
    } catch (error) {
      return { type: "error" as const, message: `Failed to create ad creative: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

export const createAd = tool({
  description: "Create a Meta ad linking a creative to an ad set. This is the final step — the ad is created in PAUSED status.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
    name: z.string().describe("Ad name"),
    adSetId: z.string().describe("The ad set ID"),
    creativeId: z.string().describe("The creative ID"),
  }),
  execute: async ({ adAccountId, name, adSetId, creativeId }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const result = await api.createAd(adAccountId, { name, adSetId, creativeId, status: "PAUSED" });
      return { type: "ad_created" as const, ...result };
    } catch (error) {
      return { type: "error" as const, message: `Failed to create ad: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

// --- Meta Read Tools ---

export const getCampaigns = tool({
  description: "Fetch all campaigns for an ad account.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
  }),
  execute: async ({ adAccountId }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const campaigns = await api.getCampaigns(adAccountId);
      return { type: "campaigns" as const, campaigns };
    } catch (error) {
      return { type: "error" as const, message: `Failed to fetch campaigns: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

export const getAdSets = tool({
  description: "Fetch ad sets for a campaign.",
  inputSchema: z.object({
    campaignId: z.string().describe("The campaign ID"),
  }),
  execute: async ({ campaignId }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const adSets = await api.getAdSets(campaignId);
      return { type: "adsets" as const, adSets };
    } catch (error) {
      return { type: "error" as const, message: `Failed to fetch ad sets: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

export const getAds = tool({
  description: "Fetch ads for an ad set.",
  inputSchema: z.object({
    adSetId: z.string().describe("The ad set ID"),
  }),
  execute: async ({ adSetId }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const ads = await api.getAds(adSetId);
      return { type: "ads" as const, ads };
    } catch (error) {
      return { type: "error" as const, message: `Failed to fetch ads: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

export const getAdInsights = tool({
  description: "Fetch performance metrics (impressions, clicks, spend, CTR) for a campaign, ad set, or ad.",
  inputSchema: z.object({
    objectId: z.string().describe("The ID of the campaign, ad set, or ad"),
  }),
  execute: async ({ objectId }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      const insights = await api.getInsights(objectId);
      return { type: "insights" as const, insights };
    } catch (error) {
      return { type: "error" as const, message: `Failed to fetch insights: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
});

// --- Status Management ---

export const updateStatus = tool({
  description:
    "Activate, pause, or archive a Meta campaign, ad set, or ad. Use this to go live (set ACTIVE) or pause a running campaign. Works on any object ID (campaign, ad set, or ad).",
  inputSchema: z.object({
    objectId: z
      .string()
      .describe("The ID of the campaign, ad set, or ad to update"),
    status: z
      .enum(["ACTIVE", "PAUSED", "ARCHIVED"])
      .describe("The new status — ACTIVE to go live, PAUSED to stop, ARCHIVED to hide"),
  }),
  execute: async ({ objectId, status }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);
      await api.updateStatus(objectId, status);
      return {
        type: "status_updated" as const,
        objectId,
        newStatus: status,
        message: `Successfully set ${objectId} to ${status}`,
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to update status: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// --- Multi-Model Creative Tools (work without Meta account) ---

export const generateAdVideo = tool({
  description:
    "Generate a short ad video using AI (Kling v3). Two modes: " +
    "(1) TEXT-TO-VIDEO (preferred): describe the scene — faster, more dynamic, no hero image needed. " +
    "(2) IMAGE-TO-VIDEO (fallback): animate an existing hero image from generateAdImage. " +
    "Creates 5-10s videos optimized for Meta Reels/Stories.",
  inputSchema: z.object({
    product: z.string().describe(
      "A VISUAL DESCRIPTION of the product — NOT just the brand name. " +
      "Include what it looks like, what category, key visual elements. " +
      "Example: 'Societiz — a mobile app showing a sleek community dashboard with member avatars and engagement metrics'"
    ),
    scene: z.string().describe(
      "The SCENE to depict — describe it like a film director. " +
      "GOOD: 'A creator in a sunlit home studio picks up their phone, the screen glows with notifications. " +
      "They smile, tap the screen, and a cascade of member avatars animates across the display. " +
      "Camera slowly dollies in toward the phone screen.' " +
      "BAD: 'person using app'. " +
      "Include: setting, action, what changes during the clip, camera movement."
    ),
    mood: z
      .string()
      .optional()
      .describe("Emotional tone (e.g., 'warm and aspirational', 'bold and energetic', 'intimate and authentic')"),
    targetEmotion: z
      .string()
      .optional()
      .describe("What the viewer should FEEL (e.g., 'desire', 'FOMO', 'belonging', 'curiosity')"),
    cameraMove: z
      .string()
      .optional()
      .describe(
        "Camera movement — each tells a different story. " +
        "Dolly in = drawing viewer closer (intimacy). " +
        "Crane up = reveal/aspiration. " +
        "Orbit = showcasing product from all angles. " +
        "Handheld = authenticity/UGC feel. " +
        "Tracking shot = following action/energy."
      ),
    aspectRatio: z
      .enum(["9:16", "16:9", "1:1"])
      .optional()
      .describe("'9:16' vertical for Reels/Stories (default), '16:9' landscape for feed/in-stream, '1:1' square for feed"),
    durationSeconds: z
      .number()
      .optional()
      .describe("Video duration in seconds (default 5, max 10). 5s for hooks, 8-10s for story ads."),
    model: z
      .enum(["kling-3", "runway-gen4"])
      .optional()
      .describe("Video model. Default: kling-3 (text-to-video). runway-gen4 is image-to-video only."),
    imageLocalPath: z
      .string()
      .optional()
      .describe("Optional: local path from generateAdImage to use image-to-video mode instead of text-to-video"),
  }),
  execute: async ({ product, scene, mood, targetEmotion, cameraMove, aspectRatio, durationSeconds, model, imageLocalPath }) => {
    try {
      const duration = durationSeconds ?? 5;
      const ar = aspectRatio ?? "9:16";

      // If an image path is provided, use image-to-video (legacy mode)
      if (imageLocalPath) {
        const motionPrompt = `${scene}. ${cameraMove ?? "Slow cinematic dolly-in."}`;
        const result = await generateVideo(
          imageLocalPath,
          motionPrompt,
          model as VideoModel | undefined,
          duration
        );
        return {
          type: "generated_video" as const,
          url: result.url,
          localPath: result.localPath,
          model: result.model,
          durationSeconds: result.durationSeconds,
        };
      }

      // Text-to-video — build a cinematic prompt via the prompt engine
      const prompt = buildVideoPrompt({
        product,
        scene,
        mood,
        targetEmotion,
        cameraMove,
        aspectRatio: ar,
      });

      const result = await generateTextToVideo(
        prompt,
        ar,
        model as VideoModel | undefined,
        duration
      );

      return {
        type: "generated_video" as const,
        url: result.url,
        localPath: result.localPath,
        model: result.model,
        durationSeconds: result.durationSeconds,
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Video generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const generateMultiFormatImages = tool({
  description:
    "Generate an ad image in all 3 Meta aspect ratios at once: 1:1 (feed), 4:5 (feed portrait), 9:16 (stories/reels). Returns 3 images ready for different placements. " +
    "Uses the prompt engine for model-optimized prompts.",
  inputSchema: z.object({
    product: z.string().describe(
      "A VISUAL DESCRIPTION of the product — NOT just the brand name. " +
      "The image model has zero context about what the product is. " +
      "GOOD: 'Societiz — a mobile app for creator communities, showing a sleek dashboard on a phone screen with member avatars and engagement metrics'. " +
      "BAD: 'Societiz'. " +
      "Include: what it looks like physically, what category it's in, key visual elements."
    ),
    style: z
      .string()
      .optional()
      .describe("Built-in style key (hero-lifestyle, product-studio, ugc-authentic, bold-graphic, before-after, macro-texture) or custom description"),
    mood: z
      .string()
      .optional()
      .describe("Emotional mood override"),
    targetEmotion: z
      .string()
      .optional()
      .describe("What the viewer should feel"),
    hero: z
      .enum(["product", "person", "transformation", "problem"])
      .optional()
      .describe("Who/what is the hero of this image?"),
    model: z
      .enum(["gpt-image-1", "flux-2-pro", "ideogram-3", "imagen-4-ultra"])
      .optional()
      .describe("Image model. Default: auto-selected"),
  }),
  execute: async ({ product, style, mood, targetEmotion, hero, model }) => {
    try {
      // Build prompt via the prompt engine (will be rewritten for model inside generateMultiFormat)
      const selectedModel: ImageModel = selectModel({
        requestedModel: model as ImageModel | undefined,
      });
      const prompt = buildPrompt(
        { product, style, mood, targetEmotion, hero },
        selectedModel,
        "1:1" // base ratio — generateMultiFormat will run all 3
      );

      const images = await generateMultiFormat(prompt, {
        requestedModel: model as ImageModel | undefined,
      });
      return {
        type: "multi_format_images" as const,
        images: images.map((img) => ({
          url: img.url,
          localPath: img.localPath,
          model: img.model,
          aspectRatio: img.aspectRatio,
        })),
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Multi-format generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const createVideoAdCreativeTool = tool({
  description:
    "Create a Meta video ad creative. Uploads the video to Meta and creates the creative with copy. Requires a video from generateAdVideo.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
    name: z.string().describe("Creative name"),
    pageId: z.string().describe("Facebook Page ID"),
    videoLocalPath: z
      .string()
      .describe("Local file path of the video (from generateAdVideo result's localPath)"),
    thumbnailImageUrl: z
      .string()
      .optional()
      .describe("URL of the thumbnail image (from generateAdImage result's url field)"),
    thumbnailImageLocalPath: z
      .string()
      .optional()
      .describe("Local cache path of the thumbnail (from generateAdImage result's localPath field). Preferred — avoids expired URL issues."),
    primaryText: z.string().describe("Primary text (main message)"),
    headline: z.string().describe("Headline text"),
    description: z.string().describe("Description text"),
    callToAction: z
      .enum(["SHOP_NOW", "LEARN_MORE", "SIGN_UP", "BOOK_NOW", "CONTACT_US", "GET_OFFER", "SUBSCRIBE", "DOWNLOAD", "GET_QUOTE", "APPLY_NOW", "ORDER_NOW", "SEND_MESSAGE", "WHATSAPP_MESSAGE"])
      .describe("Call-to-action button type"),
    linkUrl: z.string().describe("Destination URL when ad is clicked"),
  }),
  execute: async ({
    adAccountId,
    name,
    pageId,
    videoLocalPath,
    thumbnailImageUrl,
    thumbnailImageLocalPath,
    primaryText,
    headline,
    description,
    callToAction,
    linkUrl,
  }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);

      // Read cached video
      const videoBuffer = getCachedAsset(videoLocalPath);
      if (!videoBuffer) {
        return {
          type: "error" as const,
          message: `Video not found at ${videoLocalPath}. Generate a video first with generateAdVideo.`,
        };
      }

      // Upload video to Meta
      const { videoId } = await api.uploadVideo(adAccountId, videoBuffer, name);

      // Upload thumbnail image to Meta if provided (converts local path → image_hash)
      let thumbnailHash: string | undefined;
      if (thumbnailImageUrl || thumbnailImageLocalPath) {
        try {
          thumbnailHash = await api.uploadImageFromUrl(
            adAccountId,
            thumbnailImageUrl ?? "",
            thumbnailImageLocalPath ?? thumbnailImageUrl
          );
          console.log(`[createVideoAdCreative] Thumbnail uploaded, hash: ${thumbnailHash}`);
        } catch (err) {
          // Non-fatal — Meta will auto-generate a thumbnail from the video
          console.warn(`[createVideoAdCreative] Thumbnail upload failed, skipping: ${err}`);
        }
      }

      // Create video creative
      const result = await api.createVideoAdCreative(adAccountId, {
        name,
        pageId,
        videoId,
        primaryText,
        headline,
        description,
        callToAction,
        linkUrl,
        thumbnailHash,
      });

      return { type: "creative_created" as const, ...result };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to create video ad creative: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const createCarouselAdCreativeTool = tool({
  description:
    "Create a Meta carousel ad creative with 2-10 cards. Each card has an image, headline, description, and optional link. Images are automatically uploaded to Meta.",
  inputSchema: z.object({
    adAccountId: z.string().describe("The ad account ID"),
    name: z.string().describe("Creative name"),
    pageId: z.string().describe("Facebook Page ID"),
    primaryText: z.string().describe("Primary text shown above the carousel"),
    linkUrl: z.string().describe("Default destination URL"),
    cards: z
      .array(
        z.object({
          imageUrl: z.string().describe("Image URL for this card"),
          imageLocalPath: z
            .string()
            .optional()
            .describe("Local cache path from generateAdImage (preferred over imageUrl)"),
          headline: z.string().describe("Card headline"),
          description: z.string().describe("Card description"),
          linkUrl: z.string().optional().describe("Card-specific destination URL"),
          callToAction: z
            .enum(["SHOP_NOW", "LEARN_MORE", "SIGN_UP", "BOOK_NOW", "CONTACT_US", "GET_OFFER", "SUBSCRIBE"])
            .optional()
            .describe("Card CTA (default: LEARN_MORE)"),
        })
      )
      .min(2)
      .max(10)
      .describe("Carousel cards (2-10)"),
  }),
  execute: async ({ adAccountId, name, pageId, primaryText, linkUrl, cards }) => {
    const token = await getMetaToken();
    if (!token) return { type: "error" as const, message: "Meta account not connected." };
    try {
      const api = new MetaAPI(token);

      // Upload each card's image and collect hashes
      const carouselCards = [];
      for (const card of cards) {
        const imageHash = await api.uploadImageFromUrl(
          adAccountId,
          card.imageUrl,
          card.imageLocalPath
        );
        carouselCards.push({
          imageHash,
          name: card.headline,
          description: card.description,
          link: card.linkUrl,
          callToAction: card.callToAction,
        });
      }

      const result = await api.createCarouselAdCreative(adAccountId, {
        name,
        pageId,
        primaryText,
        linkUrl,
        cards: carouselCards,
      });

      return { type: "creative_created" as const, ...result };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Failed to create carousel creative: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const generateCreativeMatrixTool = tool({
  description:
    "Generate a matrix of creative variants across multiple styles, models, and aspect ratios. " +
    "Perfect for Advantage+ campaigns — each style uses CONFLICTING composition constraints " +
    "so Meta's Andromeda treats them as genuinely distinct ads, not duplicates. " +
    "Built-in styles: hero-lifestyle, product-studio, ugc-authentic, bold-graphic, before-after, macro-texture. " +
    "Each style forces different lighting, camera angle, color palette, and focal point — impossible to produce similar images.",
  inputSchema: z.object({
    product: z.string().describe(
      "A VISUAL DESCRIPTION of the product — NOT just the brand name. " +
      "The image model has zero context about what the product is. " +
      "GOOD: 'Societiz — a mobile app for creator communities, showing a sleek dashboard on a phone screen with member avatars and engagement metrics'. " +
      "BAD: 'Societiz'. " +
      "Include: what it looks like physically, what category it's in, key visual elements."
    ),
    styles: z
      .array(z.string())
      .min(1)
      .max(5)
      .describe(
        "Use built-in style KEYS for maximum diversity: " +
        "'hero-lifestyle' (environmental, golden hour, person-centric), " +
        "'product-studio' (tight studio shot, hard directional light, product hero), " +
        "'ugc-authentic' (selfie-style, phone camera, imperfect, real-world), " +
        "'bold-graphic' (flat-lay, color blocking, high saturation, pop art), " +
        "'before-after' (split composition, transformation story, color shift), " +
        "'macro-texture' (extreme close-up, surface detail, tactile). " +
        "Custom style descriptions also accepted."
      ),
    models: z
      .array(z.enum(["gpt-image-1", "flux-2-pro", "ideogram-3", "imagen-4-ultra"]))
      .optional()
      .describe("Image models. Default: best available. Each model receives prompts rewritten in its native language."),
    aspectRatios: z
      .array(z.enum(["1:1", "4:5", "9:16"]))
      .optional()
      .describe("Aspect ratios. Default: all three"),
    includeVideo: z
      .boolean()
      .optional()
      .describe("Generate video for each style's vertical images (9:16 and 4:5). Each style gets its own motion — not one generic pan."),
    videoMotionPrompt: z
      .string()
      .optional()
      .describe("Fallback motion prompt for custom styles (built-in styles have their own motion)"),
  }),
  execute: async ({ product, styles, models, aspectRatios, includeVideo, videoMotionPrompt }) => {
    try {
      const matrix = await generateCreativeMatrix(
        product,
        styles,
        models as ImageModel[] | undefined,
        aspectRatios as AspectRatio[] | undefined,
        includeVideo,
        videoMotionPrompt
      );

      return {
        type: "creative_matrix" as const,
        totalVariants: matrix.totalVariants,
        variants: matrix.variants.map((v) => ({
          style: v.style,
          image: {
            url: v.image.url,
            localPath: v.image.localPath,
            model: v.image.model,
            aspectRatio: v.image.aspectRatio,
          },
          ...(v.video && {
            video: {
              url: v.video.url,
              localPath: v.video.localPath,
              model: v.video.model,
              durationSeconds: v.video.durationSeconds,
            },
          }),
        })),
      };
    } catch (error) {
      return {
        type: "error" as const,
        message: `Creative matrix generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// --- Tool registry ---

export const allTools = {
  webSearch,
  scrapeWebpage,
  suggestTargeting,
  generateAdCopy,
  generateAdImage,
  generateAdVideo,
  generateMultiFormatImages,
  generateCreativeMatrix: generateCreativeMatrixTool,
  checkMetaConnection,
  disconnectMeta,
  getPages,
  getAdAccounts,
  getPixels,
  createPixel,
  searchInterests,
  createCampaign,
  createAdSet,
  createAdCreative,
  createVideoAdCreative: createVideoAdCreativeTool,
  createCarouselAdCreative: createCarouselAdCreativeTool,
  createAd,
  getCampaigns,
  getAdSets,
  getAds,
  getAdInsights,
  updateStatus,
};
