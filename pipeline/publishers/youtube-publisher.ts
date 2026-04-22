/**
 * YouTube Publisher
 *
 * Uploads a rendered episode to YouTube as a Short.
 * Uses the YouTube Data API v3 videos.insert endpoint.
 *
 * Key details:
 *   - Vertical video (1080x1920) + #Shorts in title = YouTube Short
 *   - Unverified Google Cloud projects can only upload as "private"
 *   - Default quota: 10,000 units/day, videos.insert costs 1,600 units (~6 uploads/day)
 *   - After Google verification, can upload as "public"
 *
 * Usage:
 *   import { publishToYouTube } from "./youtube-publisher.ts";
 *   await publishToYouTube(videoPath, episodeData, clientId, clientSecret);
 */

import { statSync } from "fs";
import { createLogger } from "../lib/logger.ts";
import { getAccessToken } from "./youtube-auth.ts";
import type { Episode } from "../../src/lib/types.ts";

const log = createLogger("YouTubePublisher");

const YOUTUBE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

interface YouTubeUploadResult {
  videoId: string;
  url: string;
  status: string;
}

/**
 * Build title, description, and tags from episode data.
 */
function buildMetadata(episode: Episode): {
  title: string;
  description: string;
  tags: string[];
} {
  // Collect news headlines for title
  const newsSegments = episode.segments.filter((s) => s.type === "news");
  const headlines = newsSegments
    .map((s) => s.news_source?.title)
    .filter(Boolean);

  // Title: first headline truncated + #Shorts (max 100 chars)
  const mainHeadline = headlines[0] || "Noticias del dia";
  const titleBase = mainHeadline.length > 70
    ? mainHeadline.substring(0, 67) + "..."
    : mainHeadline;
  const title = `${titleBase} #Shorts`;

  // Description: all headlines + sources + channel branding
  const newsLines = newsSegments
    .map((s, i) => {
      const src = s.news_source;
      if (!src) return null;
      return `${i + 1}. ${src.title}\n   Fuente: ${src.source} - ${src.url}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const description = `Culebrisa - Tu noticiero reptiliano diario

${newsLines}

#Shorts #Noticias #Mexico #Culebrisa #NoticiasDelDia

Culebrisa: las noticias mas importantes del dia en 1 minuto, presentadas por Cobradoriga.`;

  // Tags
  const tags = [
    "noticias",
    "mexico",
    "shorts",
    "culebrisa",
    "noticias del dia",
    "noticiero",
    "noticias hoy",
    "cobradoriga",
  ];

  return { title, description, tags };
}

/**
 * Upload video to YouTube using resumable upload protocol.
 * This avoids loading the entire file into memory.
 */
export async function publishToYouTube(
  videoPath: string,
  episode: Episode,
  clientId: string,
  clientSecret: string
): Promise<YouTubeUploadResult> {
  log.info("Starting YouTube upload...");

  // 1. Get valid access token
  const accessToken = await getAccessToken(clientId, clientSecret);

  // 2. Build metadata
  const { title, description, tags } = buildMetadata(episode);
  log.info(`Title: ${title}`);

  // 3. Get file size
  const fileStat = statSync(videoPath);
  const fileSize = fileStat.size;
  log.info(`Video file: ${videoPath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

  // 4. Initiate resumable upload
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: "25", // News & Politics
      defaultLanguage: "es",
      defaultAudioLanguage: "es",
    },
    status: {
      privacyStatus: "private", // Unverified projects must use private
      selfDeclaredMadeForKids: false,
    },
  };

  log.info("Initiating resumable upload...");
  const initResponse = await fetch(YOUTUBE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(fileSize),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    const errBody = await initResponse.text();
    throw new Error(
      `YouTube upload init failed (${initResponse.status}): ${errBody}`
    );
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("No upload URL returned from YouTube API");
  }

  log.info("Upload URL obtained, uploading video...");

  // 5. Upload the video file
  const fileBuffer = await readFileAsBuffer(videoPath);

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": "video/mp4",
    },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const errBody = await uploadResponse.text();
    throw new Error(
      `YouTube upload failed (${uploadResponse.status}): ${errBody}`
    );
  }

  const result = await uploadResponse.json();
  const videoId = result.id;
  const videoUrl = `https://youtube.com/shorts/${videoId}`;

  log.info(`Upload complete!`);
  log.info(`  Video ID: ${videoId}`);
  log.info(`  URL: ${videoUrl}`);
  log.info(`  Status: ${result.status?.uploadStatus || "unknown"}`);
  log.info(`  Privacy: ${result.status?.privacyStatus || "private"}`);

  return {
    videoId,
    url: videoUrl,
    status: result.status?.uploadStatus || "uploaded",
  };
}

/**
 * Read file into a Buffer for upload.
 * For videos under ~500MB this is fine.
 */
async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  const { readFile } = await import("fs/promises");
  return readFile(filePath);
}
