import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS } from "../lib/constants";
import type { Segment } from "../lib/types";

interface Props {
  segment: Segment;
  durationInFrames: number;
  newsIndex: number;
}

// Placeholder colors for different news items
const NEWS_COLORS = ["#1565C0", "#C62828", "#6A1B9A", "#E65100", "#2E7D32"];

export const NewsFullscreen: React.FC<Props> = ({
  segment,
  durationInFrames,
  newsIndex,
}) => {
  const frame = useCurrentFrame();

  // Slide in from right
  const slideIn = interpolate(frame, [0, 15], [VIDEO_WIDTH, 0], {
    extrapolateRight: "clamp",
  });

  // Ken Burns effect (slow zoom on static images)
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.1], {
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtitle reveal
  const words = segment.script_text.split(" ");
  const wordsPerSecond = 3.5;
  const framesPerWord = Math.round(30 / wordsPerSecond);
  const visibleWordCount = Math.min(
    Math.floor(frame / framesPerWord) + 1,
    words.length
  );
  const visibleText = words.slice(0, visibleWordCount).join(" ");

  const bgColor = NEWS_COLORS[newsIndex % NEWS_COLORS.length];

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Background - placeholder for actual news image/video */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          transform: `translateX(${slideIn}px) scale(${zoom})`,
          transformOrigin: "center center",
          background: `linear-gradient(160deg, ${bgColor}, ${bgColor}88, ${COLORS.background})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Placeholder visual */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: 60,
          }}
        >
          <span
            style={{
              fontSize: 120,
              filter: "grayscale(0)",
            }}
          >
            {newsIndex === 0 ? "💰" : newsIndex === 1 ? "🤖" : "⚽"}
          </span>
          <span
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontFamily: "Arial, sans-serif",
              opacity: 0.5,
              textAlign: "center",
            }}
          >
            [ AI Generated Visual ]
          </span>
        </div>
      </div>

      {/* Top gradient for readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background: `linear-gradient(${COLORS.background}AA, transparent)`,
        }}
      />

      {/* News source badge */}
      {segment.news_source && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 40,
            backgroundColor: COLORS.primary,
            borderRadius: 8,
            padding: "8px 16px",
          }}
        >
          <span
            style={{
              color: COLORS.accent,
              fontSize: 22,
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
            }}
          >
            {segment.news_source.source}
          </span>
        </div>
      )}

      {/* News title */}
      {segment.news_source && (
        <div
          style={{
            position: "absolute",
            top: 120,
            left: 40,
            right: 40,
          }}
        >
          <span
            style={{
              color: COLORS.text,
              fontSize: 42,
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
              lineHeight: 1.2,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {segment.news_source.title}
          </span>
        </div>
      )}

      {/* Bottom gradient for subtitle readability */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 400,
          background: `linear-gradient(transparent, ${COLORS.background}EE)`,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: VIDEO_HEIGHT * 0.08,
          left: 32,
          right: 32,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.overlay,
            borderRadius: 12,
            padding: "16px 28px",
            maxWidth: VIDEO_WIDTH * 0.92,
          }}
        >
          <span
            style={{
              color: COLORS.text,
              fontSize: 32,
              fontFamily: "Arial, sans-serif",
              fontWeight: 600,
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
