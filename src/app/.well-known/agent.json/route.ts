const agentCard = {
  name: "Growth AI",
  description:
    "End-to-end ads and marketing agent. Researches products, analyzes competitors, markets, and audiences; generates ad copy and creatives; and builds full campaigns on Meta.",
  version: "1.0.0",
  url: process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000",
  protocolVersion: "0.1.0",
  capabilities: {
    streaming: false,
    autonomousExecution: true,
    phasedExecution: true,
    multiTurn: true,
  },
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  authentication: [],
  skills: [
    {
      id: "research",
      name: "Product & Market Research",
      description:
        "Scrapes websites and searches the web to understand products, competitors, and market context before generating ads.",
      tags: ["research"],
    },
    {
      id: "creative",
      name: "Ad Creative Generation",
      description:
        "Generates ad copy (multiple variations using proven frameworks) and ad images optimized for Meta feeds.",
      tags: ["creative"],
    },
    {
      id: "targeting",
      name: "Audience Targeting Strategy",
      description:
        "Recommends audience targeting, budget allocation, and campaign structure based on product and goals.",
      tags: ["strategy"],
    },
    {
      id: "campaign",
      name: "Meta Campaign Management",
      description:
        "Creates full Meta ad campaigns (campaign → ad set → creative → ad) via the Meta Marketing API. All campaigns created PAUSED.",
      tags: ["meta", "execution"],
    },
    {
      id: "analytics",
      name: "Performance Analytics",
      description:
        "Fetches campaign performance metrics (impressions, clicks, spend, CTR) from Meta.",
      tags: ["meta", "analytics"],
    },
  ],
  endpoints: {
    agent: "/api/agent",
    agentCard: "/.well-known/agent.json",
  },
  requestSchema: {
    message: {
      type: "string",
      required: true,
      description: "The instruction or message",
    },
    messages: {
      type: "array",
      required: false,
      description:
        "Conversation history for multi-turn (from previous response's history field)",
    },
    metaToken: {
      type: "string",
      required: false,
      description: "Meta access token — required for any Meta API operations",
    },
    autonomous: {
      type: "boolean",
      required: false,
      default: false,
      description:
        "Execute all phases in one turn without stopping for approval",
    },
    maxSteps: {
      type: "number",
      required: false,
      default: 8,
      description: "Maximum tool execution steps (1-15)",
    },
  },
  exampleRequests: [
    {
      name: "Research only (no Meta token needed)",
      request: {
        message: "Research https://example.com and suggest an ad strategy",
        autonomous: true,
      },
    },
    {
      name: "Full autonomous campaign creation",
      request: {
        message:
          "Create a traffic campaign for https://brew.co targeting US coffee lovers, $75/day budget",
        metaToken: "EAA...",
        autonomous: true,
        maxSteps: 12,
      },
    },
    {
      name: "Phased multi-turn (start research)",
      request: {
        message: "I want to create ads for my SaaS product at https://myapp.io",
      },
    },
  ],
};

export async function GET() {
  return new Response(JSON.stringify(agentCard, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
