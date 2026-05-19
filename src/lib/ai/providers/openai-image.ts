import OpenAI from "openai";
import type {
  ImageProvider,
  ImageGenerationResult,
  AspectRatio,
} from "../creative-types";
import { cacheImage } from "../asset-cache";

/** Map our aspect ratios to OpenAI size strings */
const SIZE_MAP: Record<AspectRatio, "1024x1024" | "1024x1536" | "1536x1024"> =
  {
    "1:1": "1024x1024",
    "4:5": "1024x1536",
    "9:16": "1024x1536",
  };

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export class OpenAIImageProvider implements ImageProvider {
  model = "gpt-image-1" as const;

  async generate(
    prompt: string,
    aspectRatio: AspectRatio
  ): Promise<ImageGenerationResult> {
    const client = getClient();
    const size = SIZE_MAP[aspectRatio];

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size,
      quality: "high",
    });

    const data = response.data;
    if (!data || data.length === 0) {
      throw new Error("No image data returned from GPT Image");
    }

    const b64 = data[0].b64_json;
    if (!b64) {
      throw new Error("No base64 image data in response");
    }

    const buffer = Buffer.from(b64, "base64");
    const cached = cacheImage(buffer, "png");

    return {
      url: cached.url,
      localPath: cached.localPath,
      model: "gpt-image-1",
      aspectRatio,
      revisedPrompt: prompt,
    };
  }
}
