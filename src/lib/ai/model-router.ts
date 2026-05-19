import type {
  ImageModel,
  AspectRatio,
  ImageGenerationResult,
  ImageProvider,
  ModelSelectionContext,
} from "./creative-types";
import { OpenAIImageProvider } from "./providers/openai-image";
import { FluxImageProvider } from "./providers/flux-image";
import { IdeogramImageProvider } from "./providers/ideogram-image";
import { ImagenProvider } from "./providers/imagen-image";

// ---- Lazy-init provider singletons ----

const providers: Partial<Record<ImageModel, ImageProvider>> = {};

function getProvider(model: ImageModel): ImageProvider {
  if (!providers[model]) {
    switch (model) {
      case "gpt-image-1":
        providers[model] = new OpenAIImageProvider();
        break;
      case "flux-2-pro":
        providers[model] = new FluxImageProvider();
        break;
      case "ideogram-3":
        providers[model] = new IdeogramImageProvider();
        break;
      case "imagen-4-ultra":
        providers[model] = new ImagenProvider();
        break;
    }
  }
  return providers[model]!;
}

// ---- Availability check ----

const MODEL_ENV_KEYS: Record<ImageModel, string[]> = {
  "gpt-image-1": ["OPENAI_API_KEY"],
  "flux-2-pro": ["BFL_API_KEY"],
  "ideogram-3": ["IDEOGRAM_API_KEY"],
  "imagen-4-ultra": ["GOOGLE_AI_API_KEY"],
};

/** Returns which image models have their required API keys configured. */
export function getAvailableModels(): ImageModel[] {
  console.log("[ModelRouter] === getAvailableModels() called ===");
  const all = Object.entries(MODEL_ENV_KEYS) as [ImageModel, string[]][];
  for (const [model, keys] of all) {
    const keyStatus = keys.map((k) => `${k}=${process.env[k] ? "SET(" + process.env[k]!.slice(0, 8) + "...)" : "MISSING"}`).join(", ");
    console.log(`[ModelRouter]   ${model}: ${keyStatus}`);
  }
  const available = all
    .filter(([, keys]) => keys.every((k) => !!process.env[k]))
    .map(([model]) => model);
  console.log(`[ModelRouter]   => Available models: [${available.join(", ")}]`);
  return available;
}

// ---- Auto-selection ----

/**
 * Default model preference order — higher-quality models first.
 * FLUX 2 Pro produces the most distinctive commercial imagery.
 * Imagen 4 Ultra is best for photorealism.
 * GPT Image 1 is the fallback (tends toward generic output).
 */
const DEFAULT_MODEL_PRIORITY: ImageModel[] = [
  "flux-2-pro",
  "imagen-4-ultra",
  "ideogram-3",
  "gpt-image-1",
];

/**
 * Selects the best available model based on context.
 * Prefers FLUX 2 Pro by default — GPT Image 1 is a last-resort fallback only.
 */
export function selectModel(context: ModelSelectionContext): ImageModel {
  console.log("[ModelRouter] === selectModel() called ===");
  console.log(`[ModelRouter]   context: ${JSON.stringify(context)}`);

  if (context.requestedModel) {
    const available = getAvailableModels();
    if (available.includes(context.requestedModel)) {
      console.log(`[ModelRouter]   => Using requested model: ${context.requestedModel}`);
      return context.requestedModel;
    }
    console.warn(
      `[ModelRouter]   Requested model ${context.requestedModel} not available, falling back`
    );
  }

  const available = new Set(getAvailableModels());
  console.log(`[ModelRouter]   Available set: [${[...available].join(", ")}]`);

  // Context-specific selection
  if (context.needsTextInImage && available.has("ideogram-3")) {
    console.log("[ModelRouter]   => Context match: needsTextInImage -> ideogram-3");
    return "ideogram-3";
  }
  if (context.needsPhotorealism && available.has("imagen-4-ultra")) {
    console.log("[ModelRouter]   => Context match: needsPhotorealism -> imagen-4-ultra");
    return "imagen-4-ultra";
  }
  if (context.isProductShot && available.has("flux-2-pro")) {
    console.log("[ModelRouter]   => Context match: isProductShot -> flux-2-pro");
    return "flux-2-pro";
  }

  // Default: pick the best available model by priority
  console.log(`[ModelRouter]   No context match, walking priority list: [${DEFAULT_MODEL_PRIORITY.join(", ")}]`);
  for (const model of DEFAULT_MODEL_PRIORITY) {
    if (available.has(model)) {
      console.log(`[ModelRouter]   => Priority default: ${model}`);
      return model;
    }
    console.log(`[ModelRouter]   Skipped ${model} (not available)`);
  }

  // Absolute fallback (shouldn't happen if any key is set)
  console.log("[ModelRouter]   => ABSOLUTE FALLBACK: gpt-image-1 (no models available!)");
  return "gpt-image-1";
}

// ---- Generation dispatch ----

/**
 * Generate an image with a specific model.
 * If the model fails (quota exceeded, network error, etc.), automatically
 * retries with the next best available model.
 */
export async function generateWithModel(
  model: ImageModel,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<ImageGenerationResult> {
  console.log(`[ModelRouter] === generateWithModel() called with model=${model}, aspectRatio=${aspectRatio} ===`);
  console.log(`[ModelRouter]   prompt (first 100 chars): ${prompt.slice(0, 100)}...`);

  const available = getAvailableModels();
  // Build fallback chain: requested model first, then by priority
  const fallbackChain = [
    model,
    ...DEFAULT_MODEL_PRIORITY.filter((m) => m !== model && available.includes(m)),
  ];
  console.log(`[ModelRouter]   Fallback chain: [${fallbackChain.join(", ")}]`);

  let lastError: Error | undefined;
  for (const candidate of fallbackChain) {
    try {
      const provider = getProvider(candidate);
      console.log(`[ModelRouter]   ATTEMPTING: ${candidate} at ${aspectRatio}`);
      const result = await provider.generate(prompt, aspectRatio);
      console.log(`[ModelRouter]   SUCCESS: ${candidate} returned image at ${result.url}`);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[ModelRouter]   FAILED: ${candidate} — ${lastError.message} — trying next model`
      );
    }
  }

  throw lastError ?? new Error("All image models failed");
}

/**
 * Generate images with multiple models in parallel.
 * Returns all successful results (failed models are logged and skipped).
 */
export async function generateParallel(
  models: ImageModel[],
  prompt: string,
  aspectRatio: AspectRatio
): Promise<ImageGenerationResult[]> {
  const results = await Promise.allSettled(
    models.map((model) => generateWithModel(model, prompt, aspectRatio))
  );

  const successes: ImageGenerationResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      successes.push(r.value);
    } else {
      console.error(
        `[ModelRouter] ${models[i]} failed: ${r.reason?.message ?? r.reason}`
      );
    }
  }

  return successes;
}
