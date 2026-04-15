/**
 * Pipeline Orchestrator
 *
 * Runs the full Culebrisa pipeline:
 *   1. Collect news
 *   2. Select best news (3 stories)
 *   3. Generate script (Cobradoriga personality)
 *   4. Generate visual prompts (Snake Universe, 2 per news)
 *   5. Generate AI images (Replicate Flux Schnell, 6 total)
 *   6. Generate narration audio (ElevenLabs TTS)
 *   7. Build Episode JSON
 *
 * Usage:
 *   npx tsx pipeline/orchestrator/run.ts
 *   npx tsx pipeline/orchestrator/run.ts --skip-audio    (skip ElevenLabs)
 *   npx tsx pipeline/orchestrator/run.ts --skip-images   (skip Replicate)
 */

import { writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { createLogger } from "../lib/logger.ts";
import { collectNews } from "../collectors/news-collector.ts";
import { selectNews } from "../selectors/news-selector.ts";
import { generateScript } from "../generators/script-generator.ts";
import { generatePrompts } from "../generators/prompt-generator.ts";
import { generateImages } from "../generators/image-generator.ts";
import { generateNarration } from "../narration/narration-engine.ts";
import { buildEpisodeJSON } from "./build-episode.ts";
import type { PipelineState } from "../lib/types.ts";

const log = createLogger("Orchestrator");

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const EPISODES_DIR = resolve(PROJECT_ROOT, "episodes");

async function runPipeline() {
  const startTime = Date.now();
  const today = new Date().toISOString().split("T")[0];
  const episodeId = `${today}-001`;
  const episodeDir = resolve(EPISODES_DIR, episodeId);

  const skipAudio = process.argv.includes("--skip-audio");

  log.info(`========================================`);
  log.info(`  Culebrisa Pipeline - Episode ${episodeId}`);
  log.info(`========================================`);

  // Create episode directory
  await mkdir(episodeDir, { recursive: true });

  // Initialize pipeline state
  const state: PipelineState = {
    episode_id: episodeId,
    date: today,
    raw_news: [],
    selected_news: [],
    script: null,
    visual_prompts: [],
    generated_images: [],
    audio_segments: [],
    episode_dir: episodeDir,
  };

  try {
    // ── Step 1: Collect News ──
    log.info("\n--- Step 1: Collecting News ---");
    state.raw_news = await collectNews();
    await writeFile(
      resolve(episodeDir, "raw_news.json"),
      JSON.stringify(state.raw_news, null, 2)
    );
    log.info(`Saved ${state.raw_news.length} raw articles`);

    // ── Step 2: Select News ──
    log.info("\n--- Step 2: Selecting News ---");
    state.selected_news = await selectNews(state.raw_news);
    await writeFile(
      resolve(episodeDir, "selected_news.json"),
      JSON.stringify(state.selected_news, null, 2)
    );
    log.info(`Selected ${state.selected_news.length} articles`);

    // ── Step 3: Generate Script ──
    log.info("\n--- Step 3: Generating Script ---");
    state.script = await generateScript(state.selected_news);
    await writeFile(
      resolve(episodeDir, "script.json"),
      JSON.stringify(state.script, null, 2)
    );
    log.info("Script generated and saved");

    // ── Step 4: Generate Visual Prompts ──
    log.info("\n--- Step 4: Generating Visual Prompts ---");
    state.visual_prompts = await generatePrompts(state.selected_news);
    await writeFile(
      resolve(episodeDir, "visual_prompts.json"),
      JSON.stringify(state.visual_prompts, null, 2)
    );
    log.info("Visual prompts generated and saved");

    // ── Step 5: Generate Images ──
    const skipImages = process.argv.includes("--skip-images");
    if (skipImages) {
      log.info("\n--- Step 5: Skipping Image Generation (--skip-images flag) ---");
    } else {
      log.info("\n--- Step 5: Generating AI Images (Replicate Flux Schnell) ---");
      state.generated_images = await generateImages(
        state.visual_prompts,
        episodeDir
      );
      await writeFile(
        resolve(episodeDir, "generated_images.json"),
        JSON.stringify(state.generated_images, null, 2)
      );
      log.info(`Generated ${state.generated_images.length * 2} images`);
    }

    // ── Step 6: Generate Narration ──
    if (skipAudio) {
      log.info("\n--- Step 6: Skipping Audio (--skip-audio flag) ---");
      log.info("Audio will use estimated durations instead");
    } else {
      log.info("\n--- Step 6: Generating Narration Audio ---");
      state.audio_segments = await generateNarration(state.script, episodeDir);
      await writeFile(
        resolve(episodeDir, "audio_segments.json"),
        JSON.stringify(state.audio_segments, null, 2)
      );
      log.info("All narration audio generated");
    }

    // ── Step 7: Build Episode JSON ──
    log.info("\n--- Step 7: Building Episode JSON ---");
    const episode = await buildEpisodeJSON(state);
    const episodePath = resolve(episodeDir, "episode.json");
    await writeFile(episodePath, JSON.stringify(episode, null, 2));
    log.info(`Episode JSON saved to: ${episodePath}`);

    // Also copy to src/data for Remotion to pick up
    const remotionDataPath = resolve(
      PROJECT_ROOT,
      "src/data/episode-latest.json"
    );
    await writeFile(remotionDataPath, JSON.stringify(episode, null, 2));
    log.info(`Copied to Remotion: ${remotionDataPath}`);

    // ── Done ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(`\n========================================`);
    log.info(`  Pipeline complete in ${elapsed}s`);
    log.info(`  Episode: ${episodeId}`);
    log.info(`  Segments: ${episode.segments.length}`);
    log.info(`  Duration: ~${(episode.total_duration_ms / 1000).toFixed(0)}s`);
    log.info(`  Files: ${episodeDir}`);
    log.info(`========================================`);
    log.info(`\nNext steps:`);
    log.info(`  1. Review: cat ${episodePath}`);
    log.info(`  2. Preview: npm run studio (select CulebrisaEpisode)`);
    log.info(`  3. Render: npm run render`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    log.error(`Pipeline failed! ${errMsg}`);
    if (errStack) log.error(errStack);
    // Save partial state for debugging
    await writeFile(
      resolve(episodeDir, "pipeline_state_partial.json"),
      JSON.stringify(state, null, 2)
    );
    log.info(`Partial state saved to ${episodeDir}/pipeline_state_partial.json`);
    process.exit(1);
  }
}

// Run!
runPipeline();
