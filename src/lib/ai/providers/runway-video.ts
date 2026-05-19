import { readFileSync } from "fs";
import type { VideoProvider, VideoGenerationResult } from "../creative-types";
import { cacheVideo } from "../asset-cache";

const API_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";
const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 300_000; // 5 minutes

/** Runway only accepts these specific ratio strings */
type RunwayRatio = "1280:720" | "720:1280" | "1104:832" | "832:1104" | "960:960" | "1584:672";

/** Map a duration to the best default ratio (landscape for short, portrait for reels) */
function pickRunwayRatio(duration: number): RunwayRatio {
  // Default to landscape 16:9 — best for most ad placements
  return duration <= 5 ? "1280:720" : "1280:720";
}

function getApiKey(): string {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new Error("RUNWAY_API_KEY is not configured");
  return key;
}

export class RunwayVideoProvider implements VideoProvider {
  model = "runway-gen4" as const;

  async generateFromImage(
    imagePath: string,
    motionPrompt: string,
    duration: number = 5,
    ratio?: RunwayRatio
  ): Promise<VideoGenerationResult> {
    const key = getApiKey();
    const videoRatio = ratio ?? pickRunwayRatio(duration);

    // Read hero image as base64
    const imageBuffer = readFileSync(imagePath);
    const b64 = imageBuffer.toString("base64");
    const dataUri = `data:image/png;base64,${b64}`;

    // Create task
    const createRes = await fetch(`${API_BASE}/image_to_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_VERSION,
      },
      body: JSON.stringify({
        model: "gen4.5",
        promptImage: dataUri,
        promptText: motionPrompt,
        duration,
        ratio: videoRatio,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Runway task creation failed: ${createRes.status} — ${err}`);
    }

    const { id: taskId } = (await createRes.json()) as { id: string };
    console.log(`[Runway] Task created: ${taskId}`);

    // Poll for completion
    const deadline = Date.now() + TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Runway-Version": RUNWAY_VERSION,
        },
      });

      if (!pollRes.ok) continue;

      const result = (await pollRes.json()) as {
        status: string;
        output?: string[];
      };

      if (result.status === "SUCCEEDED" && result.output?.[0]) {
        // Download the video
        const videoRes = await fetch(result.output[0]);
        if (!videoRes.ok) {
          throw new Error(
            `Failed to download Runway video: ${videoRes.status}`
          );
        }
        const buffer = Buffer.from(await videoRes.arrayBuffer());
        const cached = cacheVideo(buffer, "mp4");

        return {
          url: cached.url,
          localPath: cached.localPath,
          model: "runway-gen4",
          durationSeconds: duration,
        };
      }

      if (result.status === "FAILED") {
        throw new Error("Runway video generation failed");
      }
    }

    throw new Error("Runway video generation timed out");
  }
}
