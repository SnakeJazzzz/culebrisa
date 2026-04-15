/**
 * Image Generator Module
 *
 * Uses Replicate API with Flux Schnell to generate images
 * from the visual prompts. Generates 2 images per news
 * (start scene + development scene).
 *
 * Cost: ~$0.003 per image = ~$0.018 per episode (6 images)
 */

import { writeFile, mkdir } from "fs/promises";
import { resolve } from "path";
import { createLogger } from "../lib/logger.ts";
import { ENV } from "../lib/config.ts";
import type { VisualPrompts, GeneratedImages } from "../lib/types.ts";

const log = createLogger("ImageGenerator");

const REPLICATE_API_URL = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";

interface ReplicateResponse {
  id: string;
  status: string;
  output: string[] | null;
  error: string | null;
  urls: { get: string };
}

/**
 * Call Replicate API to generate a single image.
 * Uses Flux Schnell — fast and cheap (~$0.003/image).
 */
async function generateImage(
  prompt: string,
  outputPath: string
): Promise<void> {
  // Create prediction
  log.debug(`Calling Replicate API: ${REPLICATE_API_URL}`);
  log.debug(`Token starts with: ${ENV.REPLICATE_API_TOKEN.substring(0, 6)}...`);
  const createRes = await fetch(REPLICATE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "9:16",
        num_outputs: 1,
        output_format: "webp",
        output_quality: 80,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Replicate API error (${createRes.status}): ${errText}`);
  }

  let prediction: ReplicateResponse = await createRes.json();

  // If not using Prefer: wait, poll until complete
  if (prediction.status !== "succeeded") {
    const pollUrl = prediction.urls.get;
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${ENV.REPLICATE_API_TOKEN}` },
      });
      prediction = await pollRes.json();

      if (prediction.status === "succeeded") break;
      if (prediction.status === "failed") {
        throw new Error(`Replicate prediction failed: ${prediction.error}`);
      }
    }
  }

  if (!prediction.output || prediction.output.length === 0) {
    throw new Error("Replicate returned no output images");
  }

  // Download the image
  const imageUrl = prediction.output[0];
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error(`Failed to download image: ${imageRes.status}`);
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  await writeFile(outputPath, imageBuffer);
  log.info(`  Saved: ${outputPath} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
}

/**
 * Generate all images for the episode.
 * Creates 2 images per news (start + develop) in the episode directory.
 */
export async function generateImages(
  prompts: VisualPrompts[],
  episodeDir: string
): Promise<GeneratedImages[]> {
  log.info(`Generating ${prompts.length * 2} images (2 per news)...`);

  const imagesDir = resolve(episodeDir, "images");
  await mkdir(imagesDir, { recursive: true });

  const results: GeneratedImages[] = [];

  for (const prompt of prompts) {
    const idx = prompt.news_index;
    log.info(`\n  News ${idx} - generating start scene...`);

    const startPath = resolve(imagesDir, `news_${idx}_start.webp`);
    await generateImage(prompt.image_prompt_start, startPath);

    // Small delay to be nice to the API
    await new Promise((r) => setTimeout(r, 500));

    log.info(`  News ${idx} - generating development scene...`);
    const developPath = resolve(imagesDir, `news_${idx}_develop.webp`);
    await generateImage(prompt.image_prompt_develop, developPath);

    results.push({
      news_index: idx,
      image_start_path: startPath,
      image_develop_path: developPath,
    });

    // Delay between news items
    if (prompt !== prompts[prompts.length - 1]) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  log.info(`\nAll ${results.length * 2} images generated successfully`);
  return results;
}
