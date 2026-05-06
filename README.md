# Culebrisa

Automated daily news video generator. Each run produces a short (~60–90 s), vertical (1080×1920) MP4 episode of a fictional snake-universe newscast hosted by **Cobradoriga**, a sarcastic cobra anchor delivering real-world news reimagined as if snakes were the dominant species.

The name is a portmanteau: *culebra* (snake) + *brisa* (breeze).

## What it does

End-to-end, in a single command, the project:

1. Pulls headlines from NewsAPI (and GNews as fallback).
2. Asks Claude to pick the 3 most video-worthy stories.
3. Asks Claude to write a Cobradoriga-voiced script in Mexican Spanish.
4. Asks Claude to translate each story into "snake-universe" image prompts.
5. Generates 6 vertical images via Replicate (Flux Schnell).
6. Generates narration MP3s via ElevenLabs and measures their exact duration.
7. Assembles an `episode.json` describing every segment, asset, and timing.
8. Renders the final MP4 with Remotion (React-based video framework).
9. Optionally uploads it to YouTube.

Output: `out/episode.mp4`, ready for YouTube / TikTok / Reels.

## Tech stack

- **Remotion 4** + **React 18** + **TypeScript** — video composition and rendering (H.264, CRF 18, 30 fps, 1080×1920).
- **@remotion/rive** + **@rive-app/react-canvas** — animated cobra anchor character.
- **Anthropic SDK (Claude)** — news selection, scriptwriting, visual prompt generation.
- **Replicate (Flux Schnell)** — AI image generation.
- **ElevenLabs HTTP API** — text-to-speech narration.
- **NewsAPI / GNews** — news source.
- **googleapis** — YouTube OAuth + upload.
- **tsx** — running TypeScript pipeline scripts directly.

## Repository layout

```
culebrisa/
├── src/                          # Remotion video composition
│   ├── index.ts                  # Remotion entry point
│   ├── Root.tsx                  # Composition setup; loads episode JSON
│   ├── CulebrisaEpisode.tsx      # Top-level video component
│   ├── components/               # Intro, Cobradoriga (Rive), news scenes, outro
│   ├── lib/                      # constants, types
│   └── data/episode-latest.json  # Last pipeline output, consumed by Remotion
│
├── pipeline/                     # Content generation (run before rendering)
│   ├── orchestrator/             # run.ts — main entry; build-episode.ts
│   ├── collectors/               # NewsAPI + GNews fetchers
│   ├── selectors/                # Claude picks 3 stories
│   ├── generators/               # script + visual prompts + Flux images
│   ├── narration/                # ElevenLabs TTS + duration measurement
│   ├── publishers/               # YouTube auth + upload
│   └── lib/                      # config, logger, JSON parsing, types
│
├── episodes/                     # Per-episode artifacts (YYYY-MM-DD-001/)
│   └── <date-id>/
│       ├── raw_news.json
│       ├── selected_news.json
│       ├── script.json
│       ├── visual_prompts.json
│       ├── generated_images.json
│       ├── audio_segments.json
│       ├── episode.json
│       ├── images/   *.webp
│       └── audio/    *.mp3
│
├── public/assets/                # Static assets served by Remotion
│   ├── culebrisamian.riv         # Cobradoriga Rive animation
│   ├── *.svg                     # Logos / intro graphics
│   ├── music/                    # Intro stinger, background loop, swoosh
│   └── audio/                    # Symlinked from current episode
│
├── out/                          # Rendered MP4s
├── Documentation/                # SRS document
├── remotion.config.ts            # Codec / quality settings
├── tsconfig.json
└── package.json
```

## Setup

Requires Node.js (with npm) and `ffmpeg` available on PATH (used by Remotion and for audio-duration probing on Linux). On macOS, `afinfo` is used by default.

```bash
npm install
cp .env.example .env   # if present; otherwise create .env with the keys below
```

### Required environment variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude — selection, script, prompts |
| `NEWSAPI_KEY` | Primary news source |
| `ELEVENLABS_API_KEY` | TTS narration |
| `ELEVENLABS_VOICE_ID` | Voice used for Cobradoriga |
| `REPLICATE_API_TOKEN` | Flux Schnell image generation |
| `YOUTUBE_CLIENT_ID` | YouTube upload (OAuth) — only if publishing |
| `YOUTUBE_CLIENT_SECRET` | YouTube upload (OAuth) — only if publishing |

GNews works without a key (free fallback tier).

For YouTube publishing, run the OAuth flow once:

```bash
npm run youtube:auth
```

## Usage

```bash
npm run studio            # Interactive Remotion preview / editor
npm run pipeline          # Run full content pipeline (writes a new episodes/<date>/ folder)
npm run pipeline:no-audio # Pipeline without TTS (uses estimated durations)
npm run render            # Render src/data/episode-latest.json -> out/episode.mp4
npm run render:preview    # Render first ~5 s only, for fast iteration
npm run daily             # pipeline && render — typical daily run
npm run youtube:publish   # Pipeline + publish to YouTube
npm run voices            # List available ElevenLabs voices for the account
```

A typical day is: `npm run daily`, then publish manually or via `npm run youtube:publish`.

## How an episode is built

The video is a sequence of segments described by `episode.json`:

1. **Intro** — Rive animation + intro stinger.
2. **News 1 / 2 / 3** — for each story, two full-screen Flux-generated images (a "start" scene and a "develop" scene) with Cobradoriga's narration on top, plus a swoosh transition.
3. **Outro** — Rive animation + closing line.

Background music starts after the intro and ducks under the narration. Subtitles are revealed word-by-word during speaking segments at roughly 3 words/second.

Every Claude output is parsed and validated as JSON; if validation fails, the pipeline halts with a clear error rather than producing a broken episode. API calls (NewsAPI, Replicate) use retries with backoff, and Replicate generations are throttled (10 s between calls) to stay within the burst limit.

## Costs (rough, per episode)

- Claude calls: ~$0.02
- Replicate (6 × Flux Schnell images): ~$0.018
- ElevenLabs TTS (~90 s audio): ~$0.005 on a paid tier
- NewsAPI / GNews: free tier sufficient for one daily run

Roughly **$0.05 per episode** at current pricing, plus ElevenLabs subscription if you exceed the free tier.

## Notes

- The pipeline writes a fresh `episodes/<YYYY-MM-DD-NNN>/` folder per run and copies its assets into `public/assets/` so Remotion's `staticFile()` can resolve them.
- `src/data/episode-latest.json` always points at the most recent successful build, so `npm run render` is safe to run independently.
- Output is intentionally vertical (9:16) for Shorts / TikTok / Reels.
