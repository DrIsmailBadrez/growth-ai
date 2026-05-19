// ---- Model identifiers ----

export type ImageModel =
  | "gpt-image-1"
  | "flux-2-pro"
  | "ideogram-3"
  | "imagen-4-ultra";

export type VideoModel = "kling-3" | "runway-gen4";

export type AspectRatio = "1:1" | "4:5" | "9:16";

// ---- Pixel dimensions per aspect ratio ----

export const ASPECT_RATIO_SIZES: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

// ---- Provider interfaces ----

export interface ImageGenerationResult {
  url: string;
  localPath: string;
  model: ImageModel;
  aspectRatio: AspectRatio;
  revisedPrompt?: string;
}

export interface VideoGenerationResult {
  url: string;
  localPath: string;
  model: VideoModel;
  durationSeconds: number;
}

export interface ImageProvider {
  model: ImageModel;
  generate(
    prompt: string,
    aspectRatio: AspectRatio
  ): Promise<ImageGenerationResult>;
}

export interface VideoProvider {
  model: VideoModel;
  generateFromImage(
    imagePath: string,
    motionPrompt: string,
    duration?: number
  ): Promise<VideoGenerationResult>;
  generateFromText?(
    prompt: string,
    aspectRatio?: "16:9" | "9:16" | "1:1",
    duration?: number
  ): Promise<VideoGenerationResult>;
}

// ---- Model selection context ----

export interface ModelSelectionContext {
  requestedModel?: ImageModel;
  needsTextInImage?: boolean;
  needsPhotorealism?: boolean;
  isProductShot?: boolean;
}

// ---- Creative variant & matrix ----

export interface CreativeVariant {
  image: ImageGenerationResult;
  video?: VideoGenerationResult;
  style: string;
}

export interface CreativeMatrix {
  totalVariants: number;
  variants: CreativeVariant[];
}
