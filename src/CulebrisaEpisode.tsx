import React from "react";
import { AbsoluteFill, Sequence, Audio } from "remotion";
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
 */
export const CulebrisaEpisode: React.FC<Props> = ({ episode }) => {
  let currentFrame = 0;
  let newsCounter = 0;

  const renderSegment = (segment: Segment, index: number) => {
    const durationInFrames = msToFrames(segment.duration_ms);
    const fromFrame = currentFrame;
    currentFrame += durationInFrames;

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
          </Sequence>
        );

      default:
        return null;
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {episode.segments.map((segment, index) => renderSegment(segment, index))}

      {/* Background music track - spans entire episode */}
      {/* TODO: Phase 3 - Add background music */}
      {/* {episode.background_music && (
        <Audio src={staticFile(episode.background_music)} volume={0.15} />
      )} */}
    </AbsoluteFill>
  );
};
