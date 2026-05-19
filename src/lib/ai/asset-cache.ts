import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

/** Directory to cache generated images — matches legacy path for backward compat */
export const IMAGE_CACHE_DIR = join(tmpdir(), "growth-ai-images");

/** Directory to cache generated videos */
export const VIDEO_CACHE_DIR = join(tmpdir(), "growth-ai-videos");

/**
 * Save an image buffer to the local cache.
 * Returns the filename, local path, and a URL served by the API route.
 */
export function cacheImage(
  buffer: Buffer,
  ext: string = "png"
): { filename: string; localPath: string; url: string } {
  mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const localPath = join(IMAGE_CACHE_DIR, filename);
  writeFileSync(localPath, buffer);
  console.log(`[AssetCache] Image saved: ${localPath} (${buffer.length} bytes)`);
  return { filename, localPath, url: `/api/image/${filename}` };
}

/**
 * Save a video buffer to the local cache.
 * Returns the filename, local path, and a URL served by the API route.
 */
export function cacheVideo(
  buffer: Buffer,
  ext: string = "mp4"
): { filename: string; localPath: string; url: string } {
  mkdirSync(VIDEO_CACHE_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const localPath = join(VIDEO_CACHE_DIR, filename);
  writeFileSync(localPath, buffer);
  console.log(`[AssetCache] Video saved: ${localPath} (${buffer.length} bytes)`);
  return { filename, localPath, url: `/api/video/${filename}` };
}

/**
 * Get a cached asset (image or video) as a Buffer.
 * Replaces the old getCachedImage — works for any file type.
 */
export function getCachedAsset(localPath: string): Buffer | null {
  try {
    if (existsSync(localPath)) {
      return readFileSync(localPath);
    }
  } catch {
    // ignore
  }
  return null;
}
