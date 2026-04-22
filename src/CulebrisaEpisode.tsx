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

// Check if swoosh sound effect exists
const SWOOSH_PATH = "assets/music/swoosh.mp3";
const SWOOSH_DURATION_FRAMES = 30; // 1 second at 30fps

/**
 * Main composition component.
 * Reads the Episode JSON and renders each segment sequentially
 * using Remotion's <Sequence> for timing.
 */
export const CulebrisaEpisode: React.FC<Props> = ({ episode }) => {
  let currentFrame = 0;
  let newsCounter = 0;

  // Pre-compute frame positions for swoosh placement
  const segmentFrames: { fromFrame: number; durationInFrames: number; type: string }[] = [];
  let tempFrame = 0;
  for (const seg of episode.segments) {
    const dur = msToFrames(seg.duration_ms);
    segmentFrames.push({ fromFrame: tempFrame, durationInFrames: dur, type: seg.type });
    tempFrame += dur;
  }

  const swooshElements: React.ReactNode[] = [];

  const renderSegment = (segment: Segment, index: number) => {
    const durationInFrames = msToFrames(segment.duration_ms);
    const fromFrame = currentFrame;
    currentFrame += durationInFrames;

    // Parse audio paths
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

    // Add swoosh at the start of each news segment
    if (segment.type === "news") {
      swooshElements.push(
        <Sequence
          key={`swoosh-${index}`}
          from={Math.max(0, fromFrame - 5)}
          durationInFrames={SWOOSH_DURATION_FRAMES}
          name={`Swoosh ${newsCounter + 1}`}
        >
          <Audio src={staticFile(SWOOSH_PATH)} volume={0.7} />
        </Sequence>
      );
    }

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

  const totalFrames = episode.segments.reduce(
    (acc, s) => acc + msToFrames(s.duration_ms),
    0
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {episode.segments.map((segment, index) => renderSegment(segment, index))}

      {/* Swoosh sound effects between news segments */}
      {swooshElements}

      {/* Background music - starts after intro to avoid clash with stinger */}
      {episode.background_music && (() => {
        const introSegment = episode.segments[0];
        const introFrames = introSegment?.type === "intro"
          ? msToFrames(introSegment.duration_ms)
          : 0;
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
