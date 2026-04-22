import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  staticFile,
} from "remotion";
import { VIDEO_WIDTH, VIDEO_HEIGHT, COLORS } from "../lib/constants";

export const IntroSegment: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in from black
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scale animation on the logo
  const scale = interpolate(frame, [0, 30, 90], [0.85, 1.05, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out in the last 15 frames
  const fadeOut = interpolate(frame, [120, 149], [1, 0], {
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
      {/* Intro SVG - fills most of the screen */}
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
        }}
      >
        <Img
          src={staticFile("assets/IntroCulebrisa.svg")}
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
