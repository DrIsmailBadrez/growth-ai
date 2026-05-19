import { generateText, stepCountIs } from "ai";
import { model } from "@/lib/ai/model";
import { allTools } from "@/lib/ai/tools";
import { buildAgentSystemPrompt } from "@/lib/ai/agent-system-prompt";
import {
  AgentRequestSchema,
  determineStatus,
  type AgentResponse,
  type AgentErrorResponse,
  type ToolInvocation,
} from "@/lib/ai/agent-types";
import { withRequestToken } from "@/lib/session";

export const maxDuration = 120;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: AgentResponse | AgentErrorResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errorResponse(
  error: string,
  code: "INVALID_REQUEST" | "INTERNAL_ERROR",
  status: number
) {
  return jsonResponse({ status: "error", error, code }, status);
}

// --- POST: Send a message, get a structured response ---

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = AgentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        "INVALID_REQUEST",
        400
      );
    }

    const { message, messages: history, metaToken, autonomous, maxSteps } = parsed.data;

    // Build conversation messages
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...(history ?? []),
      { role: "user" as const, content: message },
    ];

    const system = buildAgentSystemPrompt({
      autonomous,
      hasMetaToken: !!metaToken,
    });

    // Core execution — optionally scoped with a request token
    const execute = async () => {
      const result = await generateText({
        model,
        system,
        messages,
        tools: allTools,
        stopWhen: [stepCountIs(maxSteps)],
      });

      // Collect all tool invocations across steps
      const toolInvocations: ToolInvocation[] = [];
      for (const step of result.steps) {
        for (const call of step.toolCalls) {
          const matching = step.toolResults.find(
            (r) => r.toolCallId === call.toolCallId
          );
          toolInvocations.push({
            toolName: call.toolName,
            args: ("args" in call ? call.args : {}) as Record<string, unknown>,
            result: matching && "result" in matching ? matching.result : null,
          });
        }
      }

      const status = determineStatus(
        autonomous,
        result.finishReason,
        toolInvocations
      );

      // Build updated history for multi-turn
      const updatedHistory = [
        ...messages,
        { role: "assistant" as const, content: result.text },
      ];

      const response: AgentResponse = {
        status,
        text: result.text,
        toolInvocations,
        history: updatedHistory,
        usage: {
          promptTokens: result.usage?.inputTokens ?? 0,
          completionTokens: result.usage?.outputTokens ?? 0,
          totalTokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
        },
        finishReason: result.finishReason,
      };

      return jsonResponse(response);
    };

    // Scope Meta token per-request if provided
    if (metaToken) {
      return await withRequestToken(metaToken, execute);
    }
    return await execute();
  } catch (error) {
    console.error("Agent API error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      "INTERNAL_ERROR",
      500
    );
  }
}

// --- GET: Capability summary ---

export async function GET() {
  const toolNames = Object.keys(allTools);

  return new Response(
    JSON.stringify({
      name: "Growth AI",
      version: "1.0.0",
      description:
        "AI-powered Meta Ads agent. Researches products, generates ad creative, and creates full campaigns on Meta.",
      tools: toolNames,
      modes: {
        autonomous: "Execute all phases (research → creative → create) in one turn",
        phased: "Step through phases with multi-turn conversation",
      },
      limits: { maxSteps: 15, defaultSteps: 8 },
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
}

// --- OPTIONS: CORS preflight ---

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
