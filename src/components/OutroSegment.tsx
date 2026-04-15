import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS } from "../lib/constants";

export const OutroSegment: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Gentle pulse on the logo
  const pulse = interpolate(
    frame,
    [0, 30, 60, 89],
    [1, 1.03, 1, 1.02],
    { extrapolateRight: "clamp" }
  );

  // Text opacity (appears after logo)
  const textOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeIn,
      }}
    >
      {/* Logo */}
      <div
        style={{
          transform: `scale(${pulse})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        <Img
          src={staticFile("assets/NoticieroSerpentico.svg")}
          style={{
            width: VIDEO_WIDTH * 0.6,
            height: "auto",
            maxHeight: VIDEO_HEIGHT * 0.3,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Call to action */}
      <div
        style={{
          position: "absolute",
          bottom: VIDEO_HEIGHT * 0.2,
          left: 40,
          right: 40,
          opacity: textOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            color: COLORS.accent,
            fontSize: 40,
            fontFamily: "Arial, sans-serif",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Siguenos para mas noticias venenosas
        </span>
        <span
          style={{
            color: COLORS.textMuted,
            fontSize: 28,
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
          }}
        >
          @culebrisa
        </span>
      </div>

      {/* Decorative bottom gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          background: `linear-gradient(transparent, ${COLORS.primary}40)`,
        }}
      />
    </AbsoluteFill>
  );
};
