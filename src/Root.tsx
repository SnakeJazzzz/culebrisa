import React from "react";
import { Composition } from "remotion";
import { CulebrisaEpisode } from "./CulebrisaEpisode";
import { VIDEO_WIDTH, VIDEO_HEIGHT, FPS, msToFrames } from "./lib/constants";
import type { Episode } from "./lib/types";

// Try to load latest pipeline-generated episode, fallback to example
let episodeData: Episode;
try {
  episodeData = require("./data/episode-latest.json") as Episode;
} catch {
  episodeData = require("./data/episode-example.json") as Episode;
}

// Calculate total frames from all segments
const totalDurationFrames = episodeData.segments.reduce(
  (acc, seg) => acc + msToFrames(seg.duration_ms),
  0
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CulebrisaEpisode"
        component={CulebrisaEpisode}
        durationInFrames={totalDurationFrames}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          episode: episodeData,
        }}
      />
    </>
  );
};
