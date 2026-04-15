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

export const NewsMonitor: React.FC<Props> = ({
  segment,
  durationInFrames,
  newsIndex,
}) => {
  const frame = useCurrentFrame();

  // Fade in
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Ken Burns on the monitor content
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateRight: "clamp",
  });

  // Subtitle reveal
  const words = segment.script_text.split(" ");
  const wordsPerSecond = 3.5;
  const framesPerWord = Math.round(30 / wordsPerSecond);
  const visibleWordCount = Math.min(
    Math.floor(frame / framesPerWord) + 1,
    words.length
  );
  const visibleText = words.slice(0, visibleWordCount).join(" ");

  // Monitor area dimensions
  const monitorTop = 40;
  const monitorHeight = VIDEO_HEIGHT * 0.58;
  const monitorPadding = 24;

  // Cobradoriga area
  const cobradorigaTop = monitorTop + monitorHeight + 20;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Monitor frame */}
      <div
        style={{
          position: "absolute",
          top: monitorTop,
          left: monitorPadding,
          right: monitorPadding,
          height: monitorHeight,
          borderRadius: 20,
          border: `3px solid ${COLORS.primaryLight}`,
          overflow: "hidden",
          backgroundColor: COLORS.monitorBg,
        }}
      >
        {/* Monitor content - placeholder for AI visual */}
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            background: `linear-gradient(135deg, #1565C0, #0D47A1)`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 100 }}>
            {newsIndex === 0 ? "💰" : newsIndex === 1 ? "🤖" : "⚽"}
          </span>
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: 24,
              fontFamily: "Arial, sans-serif",
            }}
          >
            [ AI Generated Visual ]
          </span>
        </div>

        {/* News source badge inside monitor */}
        {segment.news_source && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              backgroundColor: COLORS.primary,
              borderRadius: 6,
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                color: COLORS.accent,
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                fontWeight: "bold",
              }}
            >
              {segment.news_source.source}
            </span>
          </div>
        )}

        {/* News title inside monitor */}
        {segment.news_source && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: COLORS.overlay,
              borderRadius: 8,
              padding: "10px 16px",
            }}
          >
            <span
              style={{
                color: COLORS.text,
                fontSize: 28,
                fontFamily: "Arial, sans-serif",
                fontWeight: "bold",
                lineHeight: 1.2,
              }}
            >
              {segment.news_source.title}
            </span>
          </div>
        )}
      </div>

      {/* Cobradoriga area at bottom */}
      <div
        style={{
          position: "absolute",
          top: cobradorigaTop,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Placeholder for Rive animation - Phase 2 */}
        <div
          style={{
            width: VIDEO_WIDTH * 0.5,
            height: VIDEO_HEIGHT * 0.25,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: `3px solid ${COLORS.accent}`,
          }}
        >
          <span
            style={{
              color: COLORS.accent,
              fontSize: 32,
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            COBRADORIGA
            <br />
            <span style={{ fontSize: 18, color: COLORS.textMuted }}>
              [ Rive ]
            </span>
          </span>
        </div>
      </div>

      {/* Subtitle overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 24,
          right: 24,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.overlay,
            borderRadius: 10,
            padding: "12px 24px",
            maxWidth: VIDEO_WIDTH * 0.92,
          }}
        >
          <span
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontFamily: "Arial, sans-serif",
              fontWeight: 600,
              textAlign: "center",
              lineHeight: 1.3,
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
