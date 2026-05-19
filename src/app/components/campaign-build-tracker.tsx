"use client";

import type { UIMessage } from "ai";

/* ─── Step definitions ──────────────────────────────────────── */
const STEPS = [
  {
    tool: "createCampaign",
    label: "Campaign",
    detail: "Structure & objective",
    stepLabel: "Step 1",
    accent: { badge: "bg-zinc-900 text-white", loading: "text-zinc-500", done: "bg-zinc-100 text-zinc-700" },
  },
  {
    tool: "createAdSet",
    label: "Ad Set",
    detail: "Targeting & budget",
    stepLabel: "Step 2",
    accent: { badge: "bg-blue-600 text-white", loading: "text-blue-600", done: "bg-blue-50 text-blue-700" },
  },
  {
    tool: "createAdCreative",
    label: "Creative",
    detail: "Copy & visuals",
    stepLabel: "Step 3",
    accent: { badge: "bg-violet-600 text-white", loading: "text-violet-600", done: "bg-violet-50 text-violet-700" },
  },
  {
    tool: "createAd",
    label: "Ad",
    detail: "Paused for review",
    stepLabel: "Step 4",
    accent: { badge: "bg-green-600 text-white", loading: "text-green-600", done: "bg-green-50 text-green-700" },
  },
] as const;

export const CREATION_TOOL_NAMES = new Set(STEPS.map((s) => s.tool));

type StepState = "pending" | "loading" | "done" | "error";

interface StepData {
  state: StepState;
  id?: string;
  errorText?: string;
}

export function CampaignBuildTracker({ parts }: { parts: UIMessage["parts"] }) {
  // Collect creation tool parts by tool name
  const byTool = new Map<string, StepData>();

  for (const part of parts) {
    if (!part.type.startsWith("tool-")) continue;
    const toolName = part.type.replace("tool-", "");
    if (!CREATION_TOOL_NAMES.has(toolName as (typeof STEPS)[number]["tool"])) continue;

    const tp = part as {
      state: string;
      output?: unknown;
      errorText?: string;
    };

    let stepState: StepState = "pending";
    if (tp.state === "input-streaming" || tp.state === "input-available") stepState = "loading";
    else if (tp.state === "output-available") stepState = "done";
    else if (tp.state === "output-error") stepState = "error";

    const result = tp.output as Record<string, unknown> | null;
    byTool.set(toolName, {
      state: stepState,
      id: result?.id as string | undefined,
      errorText: tp.errorText,
    });
  }

  if (byTool.size === 0) return null;

  const presentSteps = STEPS.filter((s) => byTool.has(s.tool));
  const allDone = presentSteps.every((s) => byTool.get(s.tool)?.state === "done");
  const hasError = presentSteps.some((s) => byTool.get(s.tool)?.state === "error");

  return (
    <div className="card rounded-xl overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <span className="font-medium text-foreground">
          {allDone ? "Campaign created" : hasError ? "Campaign creation failed" : "Creating campaign…"}
        </span>
        {allDone && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Paused for review
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="divide-y divide-border">
        {STEPS.filter((s) => byTool.has(s.tool)).map((step, visIdx) => {
          const data = byTool.get(step.tool)!;
          const { state, id } = data;
          const { accent } = step;

          return (
            <div
              key={step.tool}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Status badge */}
              {state === "loading" && (
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${accent.done}`}>
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              )}
              {state === "done" && (
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${accent.done}`}>
                  ✓
                </span>
              )}
              {state === "error" && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 text-[10px] font-bold">
                  ✕
                </span>
              )}

              {/* Label + sub-detail */}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{step.label}</span>
                <span className="ml-2 text-xs text-foreground-muted">
                  {state === "done" && id
                    ? `· ID ${id.slice(-10)}`
                    : state === "loading"
                      ? `· ${step.detail}…`
                      : `· ${step.detail}`}
                </span>
              </div>

              {/* Step label (right-side) */}
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                state === "done" ? accent.done : state === "loading" ? `${accent.done} opacity-70` : "bg-hover text-foreground-muted"
              }`}>
                {step.stepLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
