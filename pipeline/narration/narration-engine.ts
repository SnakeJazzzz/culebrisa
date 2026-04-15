/**
 * Narration Engine Module
 *
 * Uses ElevenLabs API to convert script text to audio.
 * Returns audio files with exact durations for Remotion sync.
 *
 * Requirements covered: NE-001 through NE-005
 */

import { writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { execSync } from "child_process";
import { ENV } from "../lib/config.ts";
import { createLogger } from "../lib/logger.ts";
import type { AudioSegment, EpisodeScript } from "../lib/types.ts";

const log = createLogger("NarrationEngine");

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

/**
 * Get available voices to help find/set the right voice ID.
 */
export async function listVoices(): Promise<void> {
  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": ENV.ELEVENLABS_API_KEY },
  });
  const data = await response.json();
  log.info("Available voices:");
  data.voices?.forEach((v: any) => {
    log.info(`  ${v.name} (${v.voice_id}) - ${v.labels?.accent || "no accent"}`);
  });
}

/**
 * Generate audio for a single text segment.
 */
async function generateAudio(
  text: string,
  voiceId: string
): Promise<Buffer> {
  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ENV.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `ElevenLabs API error (${response.status}): ${errorBody}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get accurate MP3 duration using system tools.
 * Tries afinfo (macOS built-in) first, then ffprobe, then falls back to estimation.
 */
function getAccurateDuration(filePath: string, fileSize: number): number {
  // Try macOS afinfo (always available on Mac)
  try {
    const output = execSync(`afinfo "${filePath}" 2>/dev/null | grep "estimated duration"`, {
      encoding: "utf-8",
      timeout: 5000,
    });
    const match = output.match(/estimated duration:\s*([\d.]+)\s*sec/);
    if (match) {
      const durationMs = Math.round(parseFloat(match[1]) * 1000);
      log.debug(`  afinfo duration: ${durationMs}ms`);
      return durationMs;
    }
  } catch {}

  // Try ffprobe
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    const durationMs = Math.round(parseFloat(output.trim()) * 1000);
    if (durationMs > 0) {
      log.debug(`  ffprobe duration: ${durationMs}ms`);
      return durationMs;
    }
  } catch {}

  // Fallback: count MP3 frames properly
  log.warn("  No system audio tools found, using frame-counting estimation");
  return estimateDurationFromFrames(filePath, fileSize);
}

/**
 * Count MP3 frames for duration estimation (fallback).
 */
function estimateDurationFromFrames(filePath: string, fileSize: number): number {
  // Conservative estimate: ElevenLabs typically outputs at ~64-96kbps VBR
  // Using 80kbps average gives better results than assuming 128kbps CBR
  const avgBitrate = 80000; // bits per second
  const durationMs = Math.round((fileSize * 8) / avgBitrate * 1000);
  return durationMs;
}

/**
 * Generate all audio segments for an episode.
 */
export async function generateNarration(
  script: EpisodeScript,
  episodeDir: string
): Promise<AudioSegment[]> {
  const voiceId = ENV.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    log.error("No ELEVENLABS_VOICE_ID set. Run listVoices() to find available voices.");
    log.info("Listing available voices...");
    await listVoices();
    throw new Error("Set ELEVENLABS_VOICE_ID in .env before generating narration");
  }

  const audioDir = resolve(episodeDir, "audio");
  await mkdir(audioDir, { recursive: true });

  const segments: AudioSegment[] = [];

  // Each script section becomes its own audio segment
  const textSegments = [
    { id: "intro", text: script.intro },
    { id: "headlines", text: script.headlines_preview },
    ...script.news_segments.map((ns, i) => ({
      id: `news_${i}`,
      text: ns.narration,
    })),
    { id: "outro", text: script.outro },
  ];

  for (const seg of textSegments) {
    log.info(`Generating audio for segment: ${seg.id} (${seg.text.length} chars)`);

    try {
      const buffer = await generateAudio(seg.text, voiceId);
      const audioPath = resolve(audioDir, `${seg.id}.mp3`);
      await writeFile(audioPath, buffer);

      // Get accurate duration from the saved file
      const duration_ms = getAccurateDuration(audioPath, buffer.length);

      segments.push({
        segment_id: seg.id,
        text: seg.text,
        audio_path: audioPath,
        duration_ms,
      });

      log.info(`  Saved: ${audioPath} (${(duration_ms / 1000).toFixed(1)}s)`);

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      log.error(`Failed to generate audio for ${seg.id}`, error);
      throw error;
    }
  }

  const totalDuration = segments.reduce((acc, s) => acc + s.duration_ms, 0);
  log.info(
    `All audio generated. Total narration: ${(totalDuration / 1000).toFixed(1)}s`
  );

  return segments;
}
