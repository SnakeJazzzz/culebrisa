import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS } from "../lib/constants";
import { CobradorigaRive } from "./CobradorigaRive";
import type { Segment } from "../lib/types";

interface Props {
  segment: Segment;
  durationInFrames: number;
}

export const CobradorigaSpeaks: React.FC<Props> = ({ segment, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Fade in
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtitle text reveal - word by word
  const words = segment.script_text.split(" ");
  const wordsPerSecond = 3;
  const framesPerWord = Math.round(30 / wordsPerSecond);
  const visibleWordCount = Math.min(
    Math.floor(frame / framesPerWord) + 1,
    words.length
  );
  const visibleText = words.slice(0, visibleWordCount).join(" ");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Cobradoriga Rive Animation - fills entire screen */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
        }}
      >
        <CobradorigaRive
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
      </div>

      {/* Subtitle text at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: VIDEO_HEIGHT * 0.06,
          left: 32,
          right: 32,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.overlay,
            borderRadius: 16,
            padding: "20px 32px",
            maxWidth: VIDEO_WIDTH * 0.9,
          }}
        >
          <span
            style={{
              color: COLORS.text,
              fontSize: 36,
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
              textAlign: "center",
              lineHeight: 1.4,
              display: "block",
            }}
          >
            {visibleText}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
