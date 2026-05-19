import type {
  ImageModel,
  VideoModel,
  AspectRatio,
  ImageGenerationResult,
  VideoGenerationResult,
  ModelSelectionContext,
  CreativeVariant,
  CreativeMatrix,
} from "./creative-types";
import { getCachedAsset } from "./asset-cache";
import {
  selectModel,
  generateWithModel,
  getAvailableModels,
} from "./model-router";
import {
  buildPrompt,
  rewriteForModel,
  getVideoMotion,
  type CreativeBrief,
} from "./prompt-engine";
import { KlingVideoProvider } from "./providers/kling-video";
import { RunwayVideoProvider } from "./providers/runway-video";

// ---- Backward-compatible exports ----

/**
 * Get a cached image as a Buffer, or null if not found.
 * @deprecated Use getCachedAsset from asset-cache.ts instead
 */
export function getCachedImage(localPath: string): Buffer | null {
  return getCachedAsset(localPath);
}

/**
 * Legacy generateImage — delegates to OpenAI provider via the model router.
 * Kept for backward compatibility with existing callers.
 */
export async function generateImage(
  prompt: string,
  size: "1024x1024" | "1536x1024" = "1024x1024"
): Promise<{ url: string; localPath: string; revisedPrompt: string }> {
  const aspectRatio: AspectRatio = size === "1536x1024" ? "4:5" : "1:1";
  const result = await generateWithModel("gpt-image-1", prompt, aspectRatio);
  return {
    url: result.url,
    localPath: result.localPath,
    revisedPrompt: result.revisedPrompt ?? prompt,
  };
}

// ---- New multi-model exports ----

/**
 * Generate an image using the best model for the given context.
 * Rewrites the prompt to match the selected model's native language.
 */
export async function generateImageMultiModel(
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  context: ModelSelectionContext = {}
): Promise<ImageGenerationResult> {
  console.log("[generateImageMultiModel] === CALLED ===");
  console.log(`[generateImageMultiModel]   context: ${JSON.stringify(context)}`);
  const model = selectModel(context);
  console.log(`[generateImageMultiModel]   selectModel returned: ${model}`);
  const optimizedPrompt = rewriteForModel(prompt, model);
  console.log(`[generateImageMultiModel]   Calling generateWithModel(${model}, ..., ${aspectRatio})`);
  return generateWithModel(model, optimizedPrompt, aspectRatio);
}

/**
 * Generate an image in all 3 aspect ratios (1:1, 4:5, 9:16) in parallel.
 * Prompt is rewritten for the selected model.
 */
export async function generateMultiFormat(
  prompt: string,
  context: ModelSelectionContext = {}
): Promise<ImageGenerationResult[]> {
  const model = selectModel(context);
  const optimizedPrompt = rewriteForModel(prompt, model);
  const ratios: AspectRatio[] = ["1:1", "4:5", "9:16"];

  const results = await Promise.allSettled(
    ratios.map((ratio) => generateWithModel(model, optimizedPrompt, ratio))
  );

  const images: ImageGenerationResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      images.push(r.value);
    } else {
      console.error(
        `[Creative] Multi-format failed for a ratio: ${r.reason?.message ?? r.reason}`
      );
    }
  }

  if (images.length === 0) {
    throw new Error("All multi-format image generations failed");
  }

  return images;
}

// ---- Video generation ----

const videoProviders: Partial<
  Record<VideoModel, KlingVideoProvider | RunwayVideoProvider>
> = {};

function getVideoProvider(
  model: VideoModel
): KlingVideoProvider | RunwayVideoProvider {
  if (!videoProviders[model]) {
    switch (model) {
      case "kling-3":
        videoProviders[model] = new KlingVideoProvider();
        break;
      case "runway-gen4":
        videoProviders[model] = new RunwayVideoProvider();
        break;
    }
  }
  return videoProviders[model]!;
}

function getAvailableVideoModels(): VideoModel[] {
  const models: VideoModel[] = [];
  if (process.env.FAL_API_KEY) models.push("kling-3");
  if (process.env.RUNWAY_API_KEY) models.push("runway-gen4");
  return models;
}

/**
 * Generate a video from a hero image using the specified (or best available) video model.
 */
export async function generateVideo(
  imagePath: string,
  motionPrompt: string,
  model?: VideoModel,
  duration: number = 5
): Promise<VideoGenerationResult> {
  const available = getAvailableVideoModels();
  const chosen =
    model && available.includes(model) ? model : available[0];

  if (!chosen) {
    throw new Error(
      "No video models available. Set FAL_API_KEY (Kling) or RUNWAY_API_KEY (Runway)."
    );
  }

  const provider = getVideoProvider(chosen);
  console.log(`[Creative] Generating image-to-video with ${chosen}`);
  return provider.generateFromImage(imagePath, motionPrompt, duration);
}

/**
 * Generate a video from text using the best available model.
 * Preferred over image-to-video — faster and produces more dynamic results.
 */
export async function generateTextToVideo(
  prompt: string,
  aspectRatio: "16:9" | "9:16" | "1:1" = "9:16",
  model?: VideoModel,
  duration: number = 5
): Promise<VideoGenerationResult> {
  const available = getAvailableVideoModels();
  const chosen =
    model && available.includes(model) ? model : available[0];

  if (!chosen) {
    throw new Error(
      "No video models available. Set FAL_API_KEY (Kling) or RUNWAY_API_KEY (Runway)."
    );
  }

  const provider = getVideoProvider(chosen);

  // Use text-to-video if supported, otherwise fall back to error
  if ("generateFromText" in provider && typeof provider.generateFromText === "function") {
    console.log(`[Creative] Generating text-to-video with ${chosen}`);
    return (provider as KlingVideoProvider).generateFromText(prompt, aspectRatio, duration);
  }

  throw new Error(
    `${chosen} does not support text-to-video. Use generateVideo (image-to-video) instead.`
  );
}

// ---- Creative matrix ----

/**
 * Generate a matrix of creative variants across styles, models, and aspect ratios.
 *
 * KEY DESIGN DECISIONS:
 * - Each style uses the prompt engine's structured templates (conflicting constraints)
 * - Each model gets prompts rewritten in its native language
 * - Video gets per-style motion (not one global prompt)
 * - Failed variants are logged with style/model detail
 */
export async function generateCreativeMatrix(
  product: string,
  styles: string[],
  models?: ImageModel[],
  aspectRatios?: AspectRatio[],
  includeVideo?: boolean,
  videoMotionPrompt?: string
): Promise<CreativeMatrix> {
  const effectiveModels = models?.length
    ? models.filter((m) => getAvailableModels().includes(m))
    : [selectModel({})];
  const effectiveRatios = aspectRatios?.length
    ? aspectRatios
    : (["1:1", "4:5", "9:16"] as AspectRatio[]);

  if (effectiveModels.length === 0) {
    effectiveModels.push("gpt-image-1");
  }

  const variants: CreativeVariant[] = [];
  const failures: string[] = [];

  // Build task list for all combinations
  const tasks: Array<{
    style: string;
    model: ImageModel;
    ratio: AspectRatio;
  }> = [];

  for (const style of styles) {
    for (const model of effectiveModels) {
      for (const ratio of effectiveRatios) {
        tasks.push({ style, model, ratio });
      }
    }
  }

  const results = await Promise.allSettled(
    tasks.map(async ({ style, model, ratio }) => {
      // Build a model-optimized, style-specific prompt via the prompt engine
      const brief: CreativeBrief = { product, style };
      const prompt = buildPrompt(brief, model, ratio);

      console.log(
        `[CreativeMatrix] ${style} × ${model} × ${ratio} — prompt: ${prompt.slice(0, 120)}...`
      );

      const image = await generateWithModel(model, prompt, ratio);

      // Generate video with style-appropriate motion
      let video: VideoGenerationResult | undefined;
      if (includeVideo && (ratio === "9:16" || ratio === "4:5")) {
        const motion = getVideoMotion(style, videoMotionPrompt);
        try {
          video = await generateVideo(image.localPath, motion);
        } catch (err) {
          console.error(
            `[CreativeMatrix] Video failed for ${style} × ${model}: ${err}`
          );
        }
      }

      return { image, video, style } as CreativeVariant;
    })
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      variants.push(r.value);
    } else {
      const { style, model, ratio } = tasks[i];
      const msg = `${style} × ${model} × ${ratio}: ${r.reason?.message ?? r.reason}`;
      failures.push(msg);
      console.error(`[CreativeMatrix] FAILED — ${msg}`);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `[CreativeMatrix] ${failures.length}/${tasks.length} variants failed:\n${failures.join("\n")}`
    );
  }

  return {
    totalVariants: variants.length,
    variants,
  };
}
