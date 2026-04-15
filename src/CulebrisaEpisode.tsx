import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { IntroSegment } from "./components/IntroSegment";
import { CobradorigaSpeaks } from "./components/CobradorigaSpeaks";
import { NewsFullscreen } from "./components/NewsFullscreen";
import { NewsMonitor } from "./components/NewsMonitor";
import { OutroSegment } from "./components/OutroSegment";
import { msToFrames, COLORS } from "./lib/constants";
import type { Episode, Segment } from "./lib/types";

interface Props {
  episode: Episode;
}

/**
 * Main composition component.
 * Reads the Episode JSON and renders each segment sequentially
 * using Remotion's <Sequence> for timing.
 * Audio is played per-segment based on audio_path in the JSON.
 */
export const CulebrisaEpisode: React.FC<Props> = ({ episode }) => {
  let currentFrame = 0;
  let newsCounter = 0;

  const renderSegment = (segment: Segment, index: number) => {
    const durationInFrames = msToFrames(segment.duration_ms);
    const fromFrame = currentFrame;
    currentFrame += durationInFrames;

    // Parse audio paths (can be single path or pipe-separated for multiple)
    const audioPaths = segment.audio_path
      ? segment.audio_path.split("|").filter(Boolean)
      : [];

    const audioElements = audioPaths.map((path, audioIndex) => (
      <Audio
        key={`audio-${index}-${audioIndex}`}
        src={staticFile(path)}
        volume={1}
      />
    ));

    switch (segment.type) {
      case "intro":
        return (
          <Sequence
            key={`segment-${index}`}
            from={fromFrame}
            durationInFrames={durationInFrames}
            name="Intro"
          >
            <IntroSegment />
            {audioElements}
          </Sequence>
        );

      case "cobradoriga_speaks":
        return (
          <Sequence
            key={`segment-${index}`}
            from={fromFrame}
            durationInFrames={durationInFrames}
            name={index < 3 ? "Saludo" : "Despedida"}
          >
            <CobradorigaSpeaks
              segment={segment}
              durationInFrames={durationInFrames}
            />
            {audioElements}
          </Sequence>
        );

      case "news": {
        const currentNewsIndex = newsCounter;
        newsCounter++;

        const NewsComponent =
          segment.layout === "monitor" ? NewsMonitor : NewsFullscreen;

        return (
          <Sequence
            key={`segment-${index}`}
            from={fromFrame}
            durationInFrames={durationInFrames}
            name={`Noticia ${currentNewsIndex + 1}`}
          >
            <NewsComponent
              segment={segment}
              durationInFrames={durationInFrames}
              newsIndex={currentNewsIndex}
            />
            {audioElements}
          </Sequence>
        );
      }

      case "outro":
        return (
          <Sequence
            key={`segment-${index}`}
            from={fromFrame}
            durationInFrames={durationInFrames}
            name="Outro"
          >
            <OutroSegment />
            {audioElements}
          </Sequence>
        );

      default:
        return null;
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {episode.segments.map((segment, index) => renderSegment(segment, index))}

      {/* Background music - starts after intro to avoid clash with stinger */}
      {episode.background_music && (() => {
        const introSegment = episode.segments[0];
        const introFrames = introSegment?.type === "intro"
          ? msToFrames(introSegment.duration_ms)
          : 0;
        const totalFrames = episode.segments.reduce(
          (acc, s) => acc + msToFrames(s.duration_ms),
          0
        );
        return (
          <Sequence
            from={introFrames}
            durationInFrames={totalFrames - introFrames}
            name="Background Music"
          >
            <Audio src={staticFile(episode.background_music!)} volume={0.12} loop />
          </Sequence>
        );
      })()}
    </AbsoluteFill>
  );
};
