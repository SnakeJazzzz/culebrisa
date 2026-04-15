import React from "react";
import { RemotionRiveCanvas } from "@remotion/rive";
import { staticFile } from "remotion";

interface Props {
  width: number;
  height: number;
}

/**
 * Shared Rive component for Cobradoriga animation.
 * Used in both CobradorigaSpeaks (full) and NewsMonitor (small).
 *
 * Uses default artboard and animation from the .riv file.
 * The animation is a loop: eye blink, mouth open/close, tongue.
 *
 * If you need to target a specific artboard/animation, check
 * the names in rive.app editor and set them here:
 *   artboard="YourArtboardName"
 *   animation="YourAnimationName"
 */
export const CobradorigaRive: React.FC<Props> = ({ width, height }) => {
  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <RemotionRiveCanvas
        src={staticFile("assets/culebrisamian.riv")}
        fit="contain"
        alignment="center"
      />
    </div>
  );
};
