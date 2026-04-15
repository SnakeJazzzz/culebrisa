// Video output settings
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const FPS = 30;

// Convert milliseconds to frames at our FPS
export const msToFrames = (ms: number): number => Math.round((ms / 1000) * FPS);

// Convert frames to seconds
export const framesToSeconds = (frames: number): number => frames / FPS;

// Colors - Snake universe palette
export const COLORS = {
  background: "#0A0A0A",
  primary: "#1B5E20",       // Dark green
  primaryLight: "#388E3C",  // Medium green
  accent: "#FFD600",        // Gold
  accentDark: "#F9A825",    // Dark gold
  text: "#FFFFFF",
  textMuted: "#B0BEC5",
  overlay: "rgba(0, 0, 0, 0.6)",
  monitorBg: "#111111",
};

// Asset paths
export const ASSETS = {
  riveAnimation: "public/assets/culebrisamian.riv",
  introSvg: "public/assets/IntroCulebrisa.svg",
  logoSvg: "public/assets/NoticieroSerpentico.svg",
};
