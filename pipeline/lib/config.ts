import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(import.meta.dirname, "../../.env") });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}. Copy .env.example to .env and fill in your keys.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

export const ENV = {
  ANTHROPIC_API_KEY: requireEnv("ANTHROPIC_API_KEY"),
  NEWSAPI_KEY: requireEnv("NEWSAPI_KEY"),
  ELEVENLABS_API_KEY: requireEnv("ELEVENLABS_API_KEY"),
  ELEVENLABS_VOICE_ID: optionalEnv("ELEVENLABS_VOICE_ID"),
  REPLICATE_API_TOKEN: requireEnv("REPLICATE_API_TOKEN"),
} as const;
