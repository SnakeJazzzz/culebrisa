export interface NewsSource {
  title: string;
  url: string;
  source: string;
}

export interface Prompts {
  image: string | null;
  video: string | null;
}

export type SegmentType = "intro" | "cobradoriga_speaks" | "news" | "outro";
export type LayoutType = "fullscreen" | "monitor" | "centered";
export type VisualType = "image" | "video" | "rive_animation" | "static";
export type EpisodeStatus = "pending" | "processing" | "rendered" | "published" | "failed";
export type PublishStatus = "pending" | "published" | "failed";

export interface Segment {
  type: SegmentType;
  layout: LayoutType;
  duration_ms: number;
  audio_path: string | null;
  visual_path: string | null;
  visual_path_2: string | null;
  visual_type: VisualType;
  script_text: string;
  news_source: NewsSource | null;
  prompts: Prompts | null;
}

export interface Episode {
  episode_id: string;
  date: string;
  status: EpisodeStatus;
  background_music: string | null;
  total_duration_ms: number;
  segments: Segment[];
  metadata: {
    pipeline_start: string;
    pipeline_end: string;
  };
  publish_status: {
    instagram: PublishStatus;
    tiktok: PublishStatus;
    youtube: PublishStatus;
  };
}
