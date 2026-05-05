/**
 * Pipeline-specific types.
 * These extend the Remotion types with fields needed during generation.
 */

// Raw news article from APIs
export interface RawNewsArticle {
  title: string;
  description: string;
  content: string | null;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string | null;
  category: string | null;
}

// Selected news with metadata from Claude
export interface SelectedNews {
  article: RawNewsArticle;
  order: number;
  layout: "fullscreen" | "monitor";
  reason: string; // Why this news was selected
}

// Generated script for the full episode
export interface EpisodeScript {
  intro: string;
  news_segments: {
    narration: string;
    news_index: number;
  }[];
  outro: string;
}

// Generated prompts for visual assets (2 images per news: start + development)
export interface VisualPrompts {
  news_index: number;
  image_prompt_start: string;
  image_prompt_develop: string;
}

// Generated image paths after Replicate generation
export interface GeneratedImages {
  news_index: number;
  image_start_path: string;
  image_develop_path: string;
}

// Audio segment with file path and duration
export interface AudioSegment {
  segment_id: string;
  text: string;
  audio_path: string;
  duration_ms: number;
}

// Full pipeline state - accumulated through each step
export interface PipelineState {
  episode_id: string;
  date: string;
  raw_news: RawNewsArticle[];
  selected_news: SelectedNews[];
  script: EpisodeScript | null;
  visual_prompts: VisualPrompts[];
  generated_images: GeneratedImages[];
  audio_segments: AudioSegment[];
  episode_dir: string;
}
