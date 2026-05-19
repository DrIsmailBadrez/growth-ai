import type {
  ImageProvider,
  ImageGenerationResult,
  AspectRatio,
} from "../creative-types";
import { cacheImage } from "../asset-cache";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not configured");
  return key;
}

/** Map aspect ratios to Imagen's format */
const RATIO_MAP: Record<AspectRatio, string> = {
  "1:1": "1:1",
  "4:5": "4:5",
  "9:16": "9:16",
};

export class ImagenProvider implements ImageProvider {
  model = "imagen-4-ultra" as const;

  async generate(
    prompt: string,
    aspectRatio: AspectRatio
  ): Promise<ImageGenerationResult> {
    const apiKey = getApiKey();

    // Use Imagen 4 Ultra — highest quality variant (Imagen 3 is shut down)
    const model = "imagen-4.0-ultra-generate-001";
    const endpoint = `${API_BASE}/models/${model}:predict`;

    console.log(`[Imagen] Calling ${endpoint}`);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: RATIO_MAP[aspectRatio],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Imagen generation failed: ${res.status} — ${err}`);
    }

    const body = (await res.json()) as {
      predictions: Array<{ bytesBase64Encoded: string }>;
    };

    const b64 = body.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) {
      throw new Error("No image data in Imagen response");
    }

    const buffer = Buffer.from(b64, "base64");
    const cached = cacheImage(buffer, "png");

    console.log(`[Imagen] Image saved: ${cached.localPath}`);
    return {
      url: cached.url,
      localPath: cached.localPath,
      model: "imagen-4-ultra",
      aspectRatio,
    };
  }
}
