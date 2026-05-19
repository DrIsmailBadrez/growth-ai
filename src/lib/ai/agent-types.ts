import { z } from "zod";

// --- Request ---

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const AgentRequestSchema = z.object({
  /** The instruction or message to send */
  message: z.string().min(1, "message is required"),
  /** Optional conversation history for multi-turn */
  messages: z.array(MessageSchema).optional(),
  /** Optional Meta access token for this request */
  metaToken: z.string().optional(),
  /** Skip approval gates — execute all phases in one turn */
  autonomous: z.boolean().default(false),
  /** Max tool execution steps (default 8, max 15) */
  maxSteps: z.number().int().min(1).max(15).default(8),
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;

// --- Response ---

export type AgentStatus =
  | "complete"
  | "input_required"
  | "error"
  | "max_steps_reached";

export interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentResponse {
  status: AgentStatus;
  text: string;
  toolInvocations: ToolInvocation[];
  history: Array<{ role: string; content: string }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface AgentErrorResponse {
  status: "error";
  error: string;
  code: "INVALID_REQUEST" | "INTERNAL_ERROR";
}

// --- Status determination ---

const CREATION_TOOLS = new Set([
  "createCampaign",
  "createAdSet",
  "createAdCreative",
  "createAd",
]);

export function determineStatus(
  autonomous: boolean,
  finishReason: string,
  toolInvocations: ToolInvocation[]
): AgentStatus {
  if (finishReason === "length" || finishReason === "tool-calls") {
    return "max_steps_reached";
  }
  if (autonomous) return "complete";
  const createdSomething = toolInvocations.some((t) =>
    CREATION_TOOLS.has(t.toolName)
  );
  return createdSomething ? "complete" : "input_required";
}
