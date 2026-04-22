import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS } from "../lib/constants";
import { CobradorigaRive } from "./CobradorigaRive";
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
  const hasImage1 = !!segment.visual_path;
  const hasImage2 = !!segment.visual_path_2;
  const midpoint = Math.floor(durationInFrames / 2);
  const crossfadeDuration = 12;

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

  // Image 1: Ken Burns zoom in
  const zoom1 = interpolate(frame, [0, midpoint + crossfadeDuration], [1, 1.1], {
    extrapolateRight: "clamp",
  });
  const opacity1 = hasImage2
    ? interpolate(
        frame,
        [midpoint - crossfadeDuration / 2, midpoint + crossfadeDuration / 2],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  // Image 2: Ken Burns zoom out
  const zoom2 = interpolate(frame, [midpoint, durationInFrames], [1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity2 = interpolate(
    frame,
    [midpoint - crossfadeDuration / 2, midpoint + crossfadeDuration / 2],
    [0, 1],
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

  // Layout dimensions - 40% monitor, 60% Cobradoriga
  const monitorTop = 20;
  const monitorHeight = VIDEO_HEIGHT * 0.38;
  const monitorPadding = 16;
  const cobradorigaAreaTop = monitorTop + monitorHeight;
  const cobradorigaAreaHeight = VIDEO_HEIGHT - cobradorigaAreaTop - 90;

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
        {/* Image 1 (or placeholder) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: opacity1,
          }}
        >
          {hasImage1 ? (
            <Img
              src={staticFile(segment.visual_path!)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom1})`,
                transformOrigin: "center center",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: `scale(${zoom1})`,
                transformOrigin: "center center",
                background: `linear-gradient(135deg, #1565C0, #0D47A1)`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 100 }}>🐍</span>
            </div>
          )}
        </div>

        {/* Image 2 (crossfade) */}
        {hasImage2 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: opacity2,
            }}
          >
            <Img
              src={staticFile(segment.visual_path_2!)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom2})`,
                transformOrigin: "center center",
              }}
            />
          </div>
        )}

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
              zIndex: 10,
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
              zIndex: 10,
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

      {/* Cobradoriga Rive animation at bottom */}
      <div
        style={{
          position: "absolute",
          top: cobradorigaAreaTop,
          left: 0,
          right: 0,
          height: cobradorigaAreaHeight,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CobradorigaRive
          width={VIDEO_WIDTH * 0.45}
          height={cobradorigaAreaHeight}
        />
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
