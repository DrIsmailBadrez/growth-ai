import type {
  ImageProvider,
  ImageGenerationResult,
  AspectRatio,
} from "../creative-types";
import { cacheImage } from "../asset-cache";

const BFL_API_BASE = "https://api.bfl.ai/v1";
const POLL_INTERVAL_MS = 2_000;
const TIMEOUT_MS = 120_000; // 2 minutes

function getApiKey(): string {
  const key = process.env.BFL_API_KEY;
  if (!key) throw new Error("BFL_API_KEY is not configured");
  return key;
}

export class FluxImageProvider implements ImageProvider {
  model = "flux-2-pro" as const;

  async generate(
    prompt: string,
    aspectRatio: AspectRatio
  ): Promise<ImageGenerationResult> {
    const key = getApiKey();

    // Map aspect ratio to pixel dimensions (BFL accepts width/height)
    const dimensions = ASPECT_DIMENSIONS[aspectRatio];

    // Step 1: Create generation task using FLUX.2 [MAX] — highest quality model
    console.log(`[FLUX] Creating task at ${BFL_API_BASE}/flux-2-max`);
    const createRes = await fetch(`${BFL_API_BASE}/flux-2-max`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Key": key,
      },
      body: JSON.stringify({
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        output_format: "png",
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`FLUX task creation failed: ${createRes.status} — ${err}`);
    }

    const createData = (await createRes.json()) as {
      id: string;
      polling_url?: string;
    };
    const taskId = createData.id;
    // Use polling_url from response if provided, otherwise construct one
    const pollingUrl =
      createData.polling_url ?? `${BFL_API_BASE}/get_result?id=${taskId}`;

    console.log(`[FLUX] Task created: ${taskId}, polling: ${pollingUrl}`);

    // Step 2: Poll for completion
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollRes = await fetch(pollingUrl, {
        headers: {
          Accept: "application/json",
          "X-Key": key,
        },
      });

      if (!pollRes.ok) {
        console.warn(`[FLUX] Poll returned ${pollRes.status}, retrying...`);
        continue;
      }

      const result = (await pollRes.json()) as {
        status: string;
        result?: { sample: string };
      };

      console.log(`[FLUX] Poll status: ${result.status}`);

      if (result.status === "Ready" && result.result?.sample) {
        // Download the image
        const imgRes = await fetch(result.result.sample);
        if (!imgRes.ok) {
          throw new Error(`Failed to download FLUX image: ${imgRes.status}`);
        }
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const cached = cacheImage(buffer, "png");

        console.log(`[FLUX] Image saved: ${cached.localPath}`);
        return {
          url: cached.url,
          localPath: cached.localPath,
          model: "flux-2-pro",
          aspectRatio,
        };
      }

      if (result.status === "Error") {
        throw new Error("FLUX generation failed — model returned Error status");
      }
    }

    throw new Error("FLUX generation timed out after 120s");
  }
}

/** Map aspect ratios to pixel dimensions for BFL */
const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "9:16": { width: 720, height: 1280 },
};
