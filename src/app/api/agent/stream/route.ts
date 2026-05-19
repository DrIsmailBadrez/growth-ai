import { streamText, stepCountIs } from "ai";
import { model } from "@/lib/ai/model";
import { allTools } from "@/lib/ai/tools";
import { buildAgentSystemPrompt } from "@/lib/ai/agent-system-prompt";
import {
  AgentRequestSchema,
  determineStatus,
  type ToolInvocation,
} from "@/lib/ai/agent-types";
import { withRequestToken } from "@/lib/session";

export const maxDuration = 120;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = AgentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  const { message, messages: history, metaToken, autonomous, maxSteps } = parsed.data;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...(history ?? []),
    { role: "user" as const, content: message },
  ];

  const system = buildAgentSystemPrompt({ autonomous, hasMetaToken: !!metaToken });

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sendSSE = async (event: string, data: unknown) => {
    await writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    );
  };

  const execute = async () => {
    try {
      const toolInvocations: ToolInvocation[] = [];
      const toolCallArgs = new Map<string, Record<string, unknown>>();

      const result = streamText({
        model,
        system,
        messages,
        tools: allTools,
        stopWhen: [stepCountIs(maxSteps)],
      });

      // Iterate the full stream — tool-call fires BEFORE execution,
      // tool-result fires AFTER, giving real-time progress
      for await (const event of result.fullStream) {
        if (event.type === "tool-call") {
          const input = "args" in event ? event.args : "input" in event ? event.input : {};
          toolCallArgs.set(event.toolCallId, (input ?? {}) as Record<string, unknown>);
          await sendSSE("tool_start", { tool: event.toolName });
        }
        if (event.type === "tool-result") {
          toolInvocations.push({
            toolName: event.toolName,
            args: toolCallArgs.get(event.toolCallId) ?? {},
            result: "result" in event ? event.result : "output" in event ? event.output : null,
          });
          await sendSSE("tool_end", { tool: event.toolName });
        }
      }

      const text = await result.text;
      const finishReason = await result.finishReason;
      const usage = await result.usage;

      const status = determineStatus(autonomous, finishReason, toolInvocations);
      const updatedHistory = [
        ...messages,
        { role: "assistant" as const, content: text },
      ];

      await sendSSE("done", {
        status,
        text,
        toolInvocations,
        history: updatedHistory,
        usage: {
          promptTokens: usage?.inputTokens ?? 0,
          completionTokens: usage?.outputTokens ?? 0,
          totalTokens:
            (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        },
        finishReason,
      });

      await writer.close();
    } catch (err) {
      await sendSSE("error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      await writer.close();
    }
  };

  // Fire-and-forget — the Response stream stays open until writer.close()
  if (metaToken) {
    withRequestToken(metaToken, execute);
  } else {
    execute();
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
