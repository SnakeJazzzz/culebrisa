import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS } from "../lib/constants";
import type { Segment } from "../lib/types";

// TODO: Phase 2 - Replace placeholder with actual Rive integration
// import { useRive } from "@rive-app/react-canvas";

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
      {/* Cobradoriga placeholder - Phase 2 will use Rive */}
      <div
        style={{
          position: "absolute",
          top: VIDEO_HEIGHT * 0.15,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: VIDEO_WIDTH * 0.7,
            height: VIDEO_HEIGHT * 0.45,
            borderRadius: 30,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: `4px solid ${COLORS.accent}`,
            boxShadow: `0 0 60px ${COLORS.primary}40`,
          }}
        >
          <span
            style={{
              color: COLORS.accent,
              fontSize: 48,
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
              textAlign: "center",
              padding: 40,
            }}
          >
            COBRADORIGA
            <br />
            <span style={{ fontSize: 24, color: COLORS.textMuted }}>
              [ Rive Animation Here ]
            </span>
          </span>
        </div>
      </div>

      {/* Subtitle text at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: VIDEO_HEIGHT * 0.1,
          left: 40,
          right: 40,
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
