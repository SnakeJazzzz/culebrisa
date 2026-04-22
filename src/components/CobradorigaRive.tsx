import React from "react";
import { RemotionRiveCanvas } from "@remotion/rive";
import { staticFile } from "remotion";

interface Props {
  width: number;
  height: number;
}

/**
 * Shared Rive component for Cobradoriga animation.
 *
 * The Rive artboard is landscape but our screen is portrait.
 * We use fit="contain" and let the animation sit naturally
 * in the lower portion of the frame, like a news anchor.
 *
 * For a perfect fill, re-export the .riv with a 1080x1920
 * artboard in rive.app.
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
        alignItems: "flex-end",
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
