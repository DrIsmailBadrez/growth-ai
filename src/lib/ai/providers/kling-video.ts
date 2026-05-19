import { readFileSync } from "fs";
import type { VideoProvider, VideoGenerationResult } from "../creative-types";
import { cacheVideo } from "../asset-cache";

const FAL_BASE = "https://queue.fal.run";
const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 300_000; // 5 minutes

function getApiKey(): string {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error("FAL_API_KEY is not configured");
  return key;
}

/** fal.ai queue submit response */
interface FalQueueResponse {
  request_id: string;
  status_url: string;
  response_url: string;
  cancel_url: string;
}

export class KlingVideoProvider implements VideoProvider {
  model = "kling-3" as const;

  /**
   * Text-to-video — the PRIMARY method for ad video generation.
   * Faster than image-to-video and produces more dynamic, cinematic results.
   */
  async generateFromText(
    prompt: string,
    aspectRatio: "16:9" | "9:16" | "1:1" = "9:16",
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const key = getApiKey();

    console.log(`[Kling] Text-to-video: ${aspectRatio}, ${duration}s`);
    console.log(`[Kling] Prompt (first 200 chars): ${prompt.slice(0, 200)}...`);

    const submitRes = await fetch(
      `${FAL_BASE}/fal-ai/kling-video/v3/standard/text-to-video`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${key}`,
        },
        body: JSON.stringify({
          prompt,
          duration: String(duration),
          aspect_ratio: aspectRatio,
          generate_audio: false,
          negative_prompt:
            "blur, distort, low quality, watermark, text overlay, logo, " +
            "static image, freeze frame, jerky motion, morphing artifacts, " +
            "extra limbs, deformed hands, uncanny valley face",
          cfg_scale: 0.5,
        }),
      }
    );

    if (!submitRes.ok) {
      const err = await submitRes.text();
      throw new Error(`Kling submit failed: ${submitRes.status} — ${err}`);
    }

    const queue = (await submitRes.json()) as FalQueueResponse;
    console.log(`[Kling] Queued: ${queue.request_id}`);
    console.log(`[Kling] status_url: ${queue.status_url}`);
    console.log(`[Kling] response_url: ${queue.response_url}`);

    return this._pollForResult(key, queue, duration);
  }

  /**
   * Image-to-video — fallback for animating an existing hero image.
   */
  async generateFromImage(
    imagePath: string,
    motionPrompt: string,
    duration: number = 5
  ): Promise<VideoGenerationResult> {
    const key = getApiKey();

    const imageBuffer = readFileSync(imagePath);
    const b64 = imageBuffer.toString("base64");
    const dataUri = `data:image/png;base64,${b64}`;

    console.log(`[Kling] Image-to-video: ${duration}s`);

    const submitRes = await fetch(
      `${FAL_BASE}/fal-ai/kling-video/v3/standard/image-to-video`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${key}`,
        },
        body: JSON.stringify({
          start_image_url: dataUri,
          prompt: motionPrompt,
          duration: String(duration),
          generate_audio: false,
          negative_prompt:
            "blur, distort, low quality, watermark, text overlay, logo, " +
            "static image, freeze frame, jerky motion, morphing artifacts",
          cfg_scale: 0.5,
        }),
      }
    );

    if (!submitRes.ok) {
      const err = await submitRes.text();
      throw new Error(`Kling submit failed: ${submitRes.status} — ${err}`);
    }

    const queue = (await submitRes.json()) as FalQueueResponse;
    console.log(`[Kling] Queued: ${queue.request_id}`);
    console.log(`[Kling] status_url: ${queue.status_url}`);
    console.log(`[Kling] response_url: ${queue.response_url}`);

    return this._pollForResult(key, queue, duration);
  }

  /** Poll using the URLs returned by fal.ai's queue response */
  private async _pollForResult(
    key: string,
    queue: FalQueueResponse,
    duration: number
  ): Promise<VideoGenerationResult> {
    const deadline = Date.now() + TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const statusRes = await fetch(queue.status_url, {
        headers: { Authorization: `Key ${key}` },
      });

      if (!statusRes.ok) {
        console.warn(
          `[Kling] Status poll error ${statusRes.status}: ${await statusRes.text().catch(() => "")}`
        );
        continue;
      }

      const status = (await statusRes.json()) as {
        status: string;
      };

      console.log(`[Kling] Poll: ${status.status}`);

      if (status.status === "COMPLETED") {
        // Fetch the result from response_url
        const resultRes = await fetch(queue.response_url, {
          headers: { Authorization: `Key ${key}` },
        });

        if (!resultRes.ok) {
          throw new Error(`Failed to fetch Kling result: ${resultRes.status}`);
        }

        const result = (await resultRes.json()) as {
          video: { url: string };
        };

        // Download video
        const videoRes = await fetch(result.video.url);
        if (!videoRes.ok) {
          throw new Error(
            `Failed to download Kling video: ${videoRes.status}`
          );
        }
        const buffer = Buffer.from(await videoRes.arrayBuffer());
        const cached = cacheVideo(buffer, "mp4");

        console.log(`[Kling] Video saved: ${cached.localPath}`);
        return {
          url: cached.url,
          localPath: cached.localPath,
          model: "kling-3",
          durationSeconds: duration,
        };
      }

      if (status.status === "FAILED") {
        throw new Error("Kling video generation failed");
      }
    }

    throw new Error("Kling video generation timed out");
  }
}
