import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { model } from "@/lib/ai/model";
import { systemPrompt } from "@/lib/ai/system-prompt";
import { allTools } from "@/lib/ai/tools";

export const maxDuration = 600; // 10 minutes — video generation can take 3-5 min

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools: allTools,
      stopWhen: [stepCountIs(8)],
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
