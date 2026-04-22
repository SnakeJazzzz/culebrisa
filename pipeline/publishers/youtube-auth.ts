/**
 * YouTube OAuth2 Authentication
 *
 * Desktop app flow:
 *   1. First run: opens browser for Google consent, user authorizes
 *   2. Receives auth code via local HTTP server on localhost
 *   3. Exchanges code for access + refresh tokens
 *   4. Saves tokens to .youtube-token.json
 *   5. Subsequent runs: uses refresh token to get new access token
 *
 * Usage:
 *   npx tsx pipeline/publishers/youtube-auth.ts
 */

import { createServer } from "http";
import { URL } from "url";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { createLogger } from "../lib/logger.ts";

const log = createLogger("YouTubeAuth");

const TOKEN_PATH = resolve(import.meta.dirname, "../lib/.youtube-token.json");
const REDIRECT_PORT = 3847;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

// Google OAuth2 endpoints
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Load saved tokens from disk.
 */
export async function loadTokens(): Promise<TokenData | null> {
  if (!existsSync(TOKEN_PATH)) return null;
  try {
    const raw = await readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(raw) as TokenData;
  } catch {
    return null;
  }
}

/**
 * Save tokens to disk.
 */
async function saveTokens(tokens: TokenData): Promise<void> {
  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  log.info(`Tokens saved to ${TOKEN_PATH}`);
}

/**
 * Exchange an authorization code for tokens.
 */
async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Google doesn't always return a new refresh token
    token_type: data.token_type,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Get a valid access token. Refreshes if expired, or runs full auth flow if no token exists.
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  let tokens = await loadTokens();

  if (tokens) {
    // Check if token is expired (with 5 min buffer)
    if (tokens.expiry_date > Date.now() + 5 * 60 * 1000) {
      log.info("Using cached access token (still valid)");
      return tokens.access_token;
    }

    // Refresh the token
    log.info("Access token expired, refreshing...");
    try {
      tokens = await refreshAccessToken(
        tokens.refresh_token,
        clientId,
        clientSecret
      );
      await saveTokens(tokens);
      return tokens.access_token;
    } catch (err) {
      log.warn(
        `Refresh failed: ${err instanceof Error ? err.message : String(err)}`
      );
      log.info("Will run full authorization flow...");
    }
  }

  // No token or refresh failed — run full OAuth flow
  tokens = await runAuthFlow(clientId, clientSecret);
  await saveTokens(tokens);
  return tokens.access_token;
}

/**
 * Run the full OAuth2 authorization flow:
 * Opens browser, starts local HTTP server to catch the redirect.
 */
async function runAuthFlow(
  clientId: string,
  clientSecret: string
): Promise<TokenData> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url || "/", `http://localhost:${REDIRECT_PORT}`);

        if (url.pathname !== "/") {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            "<h1>Error</h1><p>Authorization denied. You can close this window.</p>"
          );
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>Error</h1><p>No authorization code received.</p>");
          return;
        }

        // Exchange code for tokens
        const tokens = await exchangeCode(code, clientId, clientSecret);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>Culebrisa YouTube Auth</h1><p>Authorization successful! You can close this window.</p>"
        );

        server.close();
        resolvePromise(tokens);
      } catch (err) {
        res.writeHead(500);
        res.end("Internal error");
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
      });

      const authUrl = `${AUTH_URL}?${params.toString()}`;

      log.info("\n========================================");
      log.info("  YouTube Authorization Required");
      log.info("========================================");
      log.info(`\nOpen this URL in your browser:\n`);
      log.info(authUrl);
      log.info("\nWaiting for authorization...\n");

      // Try to open browser automatically (macOS)
      import("child_process")
        .then(({ exec }) => {
          exec(`open "${authUrl}"`);
        })
        .catch(() => {
          // Silently fail — user can open manually
        });
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authorization timed out after 2 minutes"));
    }, 120_000);
  });
}

// ── CLI: Run standalone to authorize ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ENV } = await import("../lib/config.ts");

  if (!ENV.YOUTUBE_CLIENT_ID || !ENV.YOUTUBE_CLIENT_SECRET) {
    log.error("Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env");
    process.exit(1);
  }

  try {
    const token = await getAccessToken(
      ENV.YOUTUBE_CLIENT_ID,
      ENV.YOUTUBE_CLIENT_SECRET
    );
    log.info(`Access token obtained (${token.substring(0, 20)}...)`);
    log.info("YouTube authorization complete!");
  } catch (err) {
    log.error(
      `Authorization failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}
