import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS, ASSETS } from "../lib/constants";

export const IntroSegment: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in from black (first 15 frames = 0.5s)
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle scale animation on the logo
  const scale = interpolate(frame, [0, 30, 60], [0.8, 1.05, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out in the last 10 frames
  const fadeOut = interpolate(frame, [70, 89], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: opacity * fadeOut,
      }}
    >
      {/* Intro SVG - replace with actual intro asset */}
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Img
          src={staticFile("assets/IntroCulebrisa.svg")}
          style={{
            width: VIDEO_WIDTH * 0.8,
            height: "auto",
            maxHeight: VIDEO_HEIGHT * 0.6,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Subtle gradient overlay at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(transparent, ${COLORS.background})`,
        }}
      />
    </AbsoluteFill>
  );
};
