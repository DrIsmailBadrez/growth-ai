import type {
  ImageProvider,
  ImageGenerationResult,
  AspectRatio,
} from "../creative-types";
import { cacheImage } from "../asset-cache";

const API_URL = "https://api.ideogram.ai/generate";

function getApiKey(): string {
  const key = process.env.IDEOGRAM_API_KEY;
  if (!key) throw new Error("IDEOGRAM_API_KEY is not configured");
  return key;
}

/** Map our ratios to Ideogram's format */
const RATIO_MAP: Record<AspectRatio, string> = {
  "1:1": "ASPECT_1_1",
  "4:5": "ASPECT_4_5",
  "9:16": "ASPECT_9_16",
};

export class IdeogramImageProvider implements ImageProvider {
  model = "ideogram-3" as const;

  async generate(
    prompt: string,
    aspectRatio: AspectRatio
  ): Promise<ImageGenerationResult> {
    const key = getApiKey();

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": key,
      },
      body: JSON.stringify({
        image_request: {
          prompt,
          model: "V_3",
          aspect_ratio: RATIO_MAP[aspectRatio],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(
        `Ideogram generation failed: ${res.status} — ${err}`
      );
    }

    const body = (await res.json()) as {
      data: Array<{ url: string }>;
    };

    const imageUrl = body.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL in Ideogram response");
    }

    // Download and cache
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download Ideogram image: ${imgRes.status}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const cached = cacheImage(buffer, "png");

    return {
      url: cached.url,
      localPath: cached.localPath,
      model: "ideogram-3",
      aspectRatio,
    };
  }
}
