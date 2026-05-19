#!/usr/bin/env node

/**
 * Growth AI MCP Server
 *
 * Exposes the Growth AI marketing agent as a single MCP tool.
 * Claude Desktop / Claude Code spawns this via stdio transport.
 * Uses SSE streaming to report real-time progress as Growth AI works.
 *
 * Usage: node mcp-server.mjs
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.GROWTH_AI_URL ?? "http://localhost:3000";
const META_TOKEN = process.env.META_TOKEN ?? undefined;

// Human-readable descriptions for each tool
const TOOL_LABELS = {
  scrapeWebpage: "Researching the website",
  webSearch: "Searching the web",
  suggestTargeting: "Building targeting strategy",
  generateAdCopy: "Writing ad copy",
  generateAdImage: "Generating ad image",
  checkMetaConnection: "Checking Meta connection",
  getAdAccounts: "Finding ad accounts",
  getPages: "Finding Facebook pages",
  searchInterests: "Researching audience interests",
  getPixels: "Checking tracking pixels",
  createPixel: "Creating tracking pixel",
  createCampaign: "Creating campaign",
  createAdSet: "Setting up ad set",
  createAdCreative: "Building ad creative",
  createAd: "Launching ad",
  getCampaigns: "Fetching campaigns",
  getAdSets: "Fetching ad sets",
  getAds: "Fetching ads",
  getAdInsights: "Pulling performance data",
  disconnectMeta: "Disconnecting Meta account",
  updateStatus: "Updating campaign status",
};

// Maintain conversation history so Growth AI can continue across calls
let conversationHistory = [];

// --- SSE parser ---
async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // keep incomplete event in buffer

    for (const part of parts) {
      if (!part.trim()) continue;
      let event = "message";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (data) {
        try {
          yield { event, data: JSON.parse(data) };
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

const server = new McpServer({
  name: "Growth AI",
  version: "1.0.0",
  instructions: `You have access to Growth AI, an autonomous marketing agent.

RULES — follow these exactly:
1. The "task" parameter must be ONE short sentence. Examples:
   - "Create ads for societiz.com targeting US creators"
   - "Proceed with campaign creation"
   - "Yes, approved"
   Growth AI already knows context from previous messages. Do NOT repeat research, creative details, or tool instructions.

2. NEVER put tokens, keys, tool names, or step-by-step instructions in the task.
   BAD: "Call getAdAccounts then createCampaign with objective OUTCOME_TRAFFIC..."
   GOOD: "Create the campaign now"

3. NEVER micromanage Growth AI. It has its own tools and decides what to call.
   If it asks for approval, just say "Approved, proceed" — nothing more.

4. Present results conversationally. Do not show raw parameters or tool names.`,
});

server.tool(
  "ask_growth_ai",
  "Ask Growth AI to do a marketing task. One short sentence only.",
  {
    task: z
      .string()
      .describe("One sentence, e.g. 'Create ads for brew.co targeting US coffee lovers'"),
  },
  async ({ task }, { reportProgress, sendNotification }) => {
    const body = {
      message: task,
      autonomous: true,
      maxSteps: 15,
    };
    if (META_TOKEN) body.metaToken = META_TOKEN;
    if (conversationHistory.length > 0) body.messages = conversationHistory;

    let res;
    try {
      res = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to connect to Growth AI at ${BASE_URL}. Is the server running? (npm run dev)\n\nError: ${err.message}`,
          },
        ],
        isError: true,
      };
    }

    if (!res.ok) {
      const text = await res.text();
      return {
        content: [{ type: "text", text: `Growth AI error (${res.status}): ${text}` }],
        isError: true,
      };
    }

    // --- Stream SSE events and report progress ---
    let finalData = null;
    let stepCount = 0;
    const completedTools = [];

    for await (const { event, data } of parseSSE(res)) {
      if (event === "tool_start") {
        const label = TOOL_LABELS[data.tool] ?? data.tool;

        // Report numeric progress
        try {
          await reportProgress(stepCount, 10);
        } catch {}

        // Send logging notification with human-readable status
        try {
          await sendNotification({
            method: "notifications/message",
            params: { level: "info", data: `⏳ ${label}...` },
          });
        } catch {}
      }

      if (event === "tool_end") {
        stepCount++;
        completedTools.push(data.tool);
        const label = TOOL_LABELS[data.tool] ?? data.tool;

        try {
          await reportProgress(stepCount, 10);
        } catch {}

        try {
          await sendNotification({
            method: "notifications/message",
            params: { level: "info", data: `✓ ${label}` },
          });
        } catch {}
      }

      if (event === "done") {
        finalData = data;
      }

      if (event === "error") {
        return {
          content: [{ type: "text", text: `Growth AI error: ${data.message}` }],
          isError: true,
        };
      }
    }

    if (!finalData) {
      return {
        content: [{ type: "text", text: "Growth AI returned no result." }],
        isError: true,
      };
    }

    // Update conversation history for next call
    if (finalData.history) {
      conversationHistory = finalData.history;
    }

    // Extract generated images
    const images = (finalData.toolInvocations ?? [])
      .filter((t) => t.toolName === "generateAdImage" && t.result?.url)
      .map((t) => ({
        url: `${BASE_URL}${t.result.url}`,
        prompt: t.result.revisedPrompt ?? t.result.originalPrompt ?? "",
      }));

    const imageSection =
      images.length > 0
        ? `\n\n---\n**Generated Creatives:**\n${images.map((img, i) => `${i + 1}. ${img.url}\n   Prompt: ${img.prompt}`).join("\n")}`
        : "";

    // Build a progress trail showing what Growth AI did
    const progressTrail =
      completedTools.length > 0
        ? `\n\n---\n**Steps completed:** ${completedTools.map((t) => TOOL_LABELS[t] ?? t).join(" → ")}`
        : "";

    const statusNote =
      finalData.status === "max_steps_reached"
        ? "\n\n(Note: Max steps reached — say 'continue' to pick up where it left off.)"
        : "";

    const content = [
      {
        type: "text",
        text: `${finalData.text}${imageSection}${progressTrail}${statusNote}`,
      },
    ];

    // Include images as MCP image content blocks
    for (const img of images) {
      try {
        const imgRes = await fetch(img.url);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          content.push({
            type: "image",
            data: base64,
            mimeType: "image/png",
          });
        }
      } catch {
        // Image fetch failed — URL is still in the text above
      }
    }

    return { content };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
