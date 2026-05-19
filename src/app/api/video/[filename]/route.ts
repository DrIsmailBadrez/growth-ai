import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { tmpdir } from "os";

const VIDEO_CACHE_DIR = join(tmpdir(), "growth-ai-videos");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize: only allow uuid.mp4 filenames
  if (!/^[a-f0-9-]+\.mp4$/.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(VIDEO_CACHE_DIR, filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const buffer = readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
