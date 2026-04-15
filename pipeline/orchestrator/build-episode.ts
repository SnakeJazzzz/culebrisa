/**
 * Episode Builder
 *
 * Takes the full PipelineState and assembles the Episode JSON
 * that Remotion reads to render the final video.
 * Copies audio files to public/ so Remotion can serve them via staticFile().
 */

import { resolve, basename } from "path";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { createLogger } from "../lib/logger.ts";
import type { PipelineState } from "../lib/types.ts";

// Import the Remotion Episode type
import type { Episode, Segment } from "../../src/lib/types.ts";

const log = createLogger("EpisodeBuilder");

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

/**
 * Copy audio files to public/assets/audio/ so Remotion can access them.
 * Returns the staticFile-compatible path (relative to public/).
 */
async function copyAudioToPublic(
  absolutePath: string,
  episodeId: string
): Promise<string> {
  const publicAudioDir = resolve(
    PROJECT_ROOT,
    "public/assets/audio",
    episodeId
  );
  await mkdir(publicAudioDir, { recursive: true });

  const filename = basename(absolutePath);
  const destPath = resolve(publicAudioDir, filename);
  await copyFile(absolutePath, destPath);

  // Return path relative to public/ for staticFile()
  return `assets/audio/${episodeId}/${filename}`;
}

/**
 * Copy image file to public/assets/visuals/ for Remotion.
 */
async function copyImageToPublic(
  absolutePath: string,
  episodeId: string,
  filename: string
): Promise<string> {
  const publicVisualsDir = resolve(
    PROJECT_ROOT,
    "public/assets/visuals",
    episodeId
  );
  await mkdir(publicVisualsDir, { recursive: true });

  const destPath = resolve(publicVisualsDir, filename);
  await copyFile(absolutePath, destPath);

  return `assets/visuals/${episodeId}/${filename}`;
}

/**
 * Build the Episode JSON from pipeline state.
 * This is the contract between the pipeline and Remotion.
 */
export async function buildEpisodeJSON(state: PipelineState): Promise<Episode> {
  log.info("Building Episode JSON...");

  const segments: Segment[] = [];
  const introAudio = state.audio_segments.find((a) => a.segment_id === "intro");
  const headlinesAudio = state.audio_segments.find((a) => a.segment_id === "headlines");
  const outroAudio = state.audio_segments.find((a) => a.segment_id === "outro");

  // Helper: copy audio and get staticFile path
  async function audioPath(absolutePath: string | undefined): Promise<string | null> {
    if (!absolutePath) return null;
    return copyAudioToPublic(absolutePath, state.episode_id);
  }

  // 1. Intro segment (logo + intro stinger music)
  const introMusicFile = resolve(PROJECT_ROOT, "public/assets/music/Intro.mp3");
  const introMusicPath = existsSync(introMusicFile) ? "assets/music/Intro.mp3" : null;
  const introDuration = introMusicPath ? 5000 : 3000; // match stinger duration
  if (introMusicPath) {
    log.info(`Intro stinger found: ${introMusicPath} (${introDuration}ms)`);
  }
  segments.push({
    type: "intro",
    layout: "fullscreen",
    duration_ms: introDuration,
    audio_path: introMusicPath,
    visual_path: null,
    visual_path_2: null,
    visual_type: "static",
    script_text: "",
    news_source: null,
    prompts: null,
  });

  // 2. Cobradoriga greeting (intro)
  const introAudioPath = await audioPath(introAudio?.audio_path);
  segments.push({
    type: "cobradoriga_speaks",
    layout: "centered",
    duration_ms: introAudio?.duration_ms || 5000,
    audio_path: introAudioPath,
    visual_path: null,
    visual_path_2: null,
    visual_type: "rive_animation",
    script_text: state.script?.intro || "",
    news_source: null,
    prompts: null,
  });

  // 3. Cobradoriga headlines preview
  const headlinesAudioPath = await audioPath(headlinesAudio?.audio_path);
  segments.push({
    type: "cobradoriga_speaks",
    layout: "centered",
    duration_ms: headlinesAudio?.duration_ms || 4000,
    audio_path: headlinesAudioPath,
    visual_path: null,
    visual_path_2: null,
    visual_type: "rive_animation",
    script_text: state.script?.headlines_preview || "",
    news_source: null,
    prompts: null,
  });

  // 4. News segments (with AI-generated images)
  for (let i = 0; i < state.selected_news.length; i++) {
    const news = state.selected_news[i];
    const newsAudio = state.audio_segments.find(
      (a) => a.segment_id === `news_${i}`
    );
    const prompt = state.visual_prompts.find((p) => p.news_index === i);
    const genImages = state.generated_images.find((g) => g.news_index === i);
    const newsAudioPath = await audioPath(newsAudio?.audio_path);

    // Copy generated images to public/ for Remotion
    let visualPath1: string | null = null;
    let visualPath2: string | null = null;
    if (genImages) {
      visualPath1 = await copyImageToPublic(
        genImages.image_start_path,
        state.episode_id,
        `news_${i}_start.webp`
      );
      visualPath2 = await copyImageToPublic(
        genImages.image_develop_path,
        state.episode_id,
        `news_${i}_develop.webp`
      );
      log.info(`  News ${i}: images copied to public/`);
    }

    segments.push({
      type: "news",
      layout: news.layout,
      duration_ms: newsAudio?.duration_ms || 12000,
      audio_path: newsAudioPath,
      visual_path: visualPath1,
      visual_path_2: visualPath2,
      visual_type: "image",
      script_text: state.script?.news_segments[i]?.narration || "",
      news_source: {
        title: news.article.title,
        url: news.article.url,
        source: news.article.source,
      },
      prompts: prompt
        ? {
            image: prompt.image_prompt_start,
            video: prompt.image_prompt_develop,
          }
        : null,
    });
  }

  // 5. Cobradoriga outro
  const outroNarrationPath = await audioPath(outroAudio?.audio_path);
  const outroDuration = outroAudio?.duration_ms || 4000;
  segments.push({
    type: "cobradoriga_speaks",
    layout: "centered",
    duration_ms: outroDuration,
    audio_path: outroNarrationPath,
    visual_path: null,
    visual_path_2: null,
    visual_type: "rive_animation",
    script_text: state.script?.outro || "",
    news_source: null,
    prompts: null,
  });

  // 6. Outro segment (3 seconds, logo + CTA)
  segments.push({
    type: "outro",
    layout: "fullscreen",
    duration_ms: 3000,
    audio_path: null,
    visual_path: null,
    visual_path_2: null,
    visual_type: "static",
    script_text: "",
    news_source: null,
    prompts: null,
  });

  const totalDuration = segments.reduce((acc, s) => acc + s.duration_ms, 0);

  // Check for background music in public/assets/music/
  const musicDir = resolve(PROJECT_ROOT, "public/assets/music");
  const musicFile = resolve(musicDir, "background.mp3");
  let backgroundMusic: string | null = null;
  if (existsSync(musicFile)) {
    backgroundMusic = "assets/music/background.mp3";
    log.info(`Background music found: ${backgroundMusic}`);
  } else {
    log.info("No background music found at public/assets/music/background.mp3 — skipping");
  }

  const episode: Episode = {
    episode_id: state.episode_id,
    date: state.date,
    status: "rendered",
    background_music: backgroundMusic,
    total_duration_ms: totalDuration,
    segments,
    metadata: {
      pipeline_start: new Date().toISOString(),
      pipeline_end: new Date().toISOString(),
    },
    publish_status: {
      instagram: "pending",
      tiktok: "pending",
      youtube: "pending",
    },
  };

  log.info(
    `Episode built: ${segments.length} segments, ~${(totalDuration / 1000).toFixed(0)}s total`
  );
  log.info("Audio files copied to public/assets/audio/");

  return episode;
}
