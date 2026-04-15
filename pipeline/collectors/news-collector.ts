/**
 * News Collector Module
 *
 * Fetches news from multiple sources:
 *   1. NewsAPI (top-headlines + everything endpoints)
 *   2. GNews API (free fallback, no key needed for basic use)
 *
 * Requirements covered: NC-001 through NC-007
 */

import { ENV } from "../lib/config.ts";
import { createLogger } from "../lib/logger.ts";
import type { RawNewsArticle } from "../lib/types.ts";

const log = createLogger("NewsCollector");

const NEWSAPI_BASE = "https://newsapi.org/v2";
const GNEWS_BASE = "https://gnews.io/api/v4";

// Retry helper with exponential backoff (NC-007)
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      const body = await response.text().catch(() => "");
      log.warn(
        `Attempt ${attempt}/${maxRetries} failed: HTTP ${response.status} - ${body.slice(0, 200)}`
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch (error) {
      log.warn(`Attempt ${attempt}/${maxRetries} network error: ${error}`);
      if (attempt === maxRetries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("All retry attempts exhausted");
}

// ── NewsAPI Sources ──

async function fetchNewsAPI(
  endpoint: string,
  label: string
): Promise<RawNewsArticle[]> {
  log.info(`Fetching ${label}...`);

  try {
    const response = await fetchWithRetry(endpoint);
    const data = await response.json();

    if (data.status !== "ok") {
      log.warn(`NewsAPI ${label} returned status: ${data.status}`, data.message || data.code);
      return [];
    }

    const articles = (data.articles || [])
      .filter((a: any) => a.title && a.title !== "[Removed]")
      .map((a: any) => ({
        title: a.title || "",
        description: a.description || "",
        content: a.content || null,
        url: a.url || "",
        source: a.source?.name || "Unknown",
        publishedAt: a.publishedAt || new Date().toISOString(),
        imageUrl: a.urlToImage || null,
        category: label,
      }));

    log.info(`  ${label}: ${articles.length} articles`);
    return articles;
  } catch (e) {
    log.warn(`  ${label} failed: ${e}`);
    return [];
  }
}

async function fetchMexicoHeadlines(): Promise<RawNewsArticle[]> {
  return fetchNewsAPI(
    `${NEWSAPI_BASE}/top-headlines?country=mx&pageSize=20&apiKey=${ENV.NEWSAPI_KEY}`,
    "mexico-headlines"
  );
}

async function fetchSpanishHeadlines(): Promise<RawNewsArticle[]> {
  return fetchNewsAPI(
    `${NEWSAPI_BASE}/top-headlines?language=es&pageSize=20&apiKey=${ENV.NEWSAPI_KEY}`,
    "spanish-headlines"
  );
}

async function fetchMexicoEverything(): Promise<RawNewsArticle[]> {
  // 'everything' endpoint with Mexico-related terms as fallback
  const query = encodeURIComponent("Mexico OR CDMX OR peso mexicano");
  return fetchNewsAPI(
    `${NEWSAPI_BASE}/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=20&apiKey=${ENV.NEWSAPI_KEY}`,
    "mexico-everything"
  );
}

async function fetchWorldEverything(): Promise<RawNewsArticle[]> {
  const query = encodeURIComponent("breaking OR economia OR tecnologia OR deportes");
  return fetchNewsAPI(
    `${NEWSAPI_BASE}/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=20&apiKey=${ENV.NEWSAPI_KEY}`,
    "world-everything"
  );
}

// ── GNews Fallback (no API key needed for basic, or use free tier) ──

async function fetchGNews(): Promise<RawNewsArticle[]> {
  log.info("Fetching GNews fallback (Mexico + Spanish)...");

  try {
    // GNews free tier: 10 requests/day, 10 articles each
    // No API key needed for basic access
    const url = `${GNEWS_BASE}/top-headlines?category=general&lang=es&country=mx&max=10&apikey=free`;
    const response = await fetch(url);

    if (!response.ok) {
      log.warn(`GNews returned HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const articles = (data.articles || []).map((a: any) => ({
      title: a.title || "",
      description: a.description || "",
      content: a.content || null,
      url: a.url || "",
      source: a.source?.name || "Unknown",
      publishedAt: a.publishedAt || new Date().toISOString(),
      imageUrl: a.image || null,
      category: "gnews-mexico",
    }));

    log.info(`  GNews: ${articles.length} articles`);
    return articles;
  } catch (e) {
    log.warn(`  GNews failed: ${e}`);
    return [];
  }
}

// ── Deduplication ──

function deduplicateArticles(articles: RawNewsArticle[]): RawNewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const hash = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .slice(0, 60)
      .trim();

    if (!hash || seen.has(hash) || article.title === "[Removed]") {
      return false;
    }
    seen.add(hash);
    return true;
  });
}

// ── Main Collector ──

export async function collectNews(): Promise<RawNewsArticle[]> {
  log.info("Starting news collection from multiple sources...");

  // Try all sources in parallel. Some may fail (free tier limits) -- that's fine.
  const results = await Promise.all([
    fetchMexicoHeadlines(),
    fetchSpanishHeadlines(),
    fetchMexicoEverything(),
    fetchWorldEverything(),
    fetchGNews(),
  ]);

  const allArticles = results.flat();
  log.info(`Total raw articles from all sources: ${allArticles.length}`);

  // Log per-source breakdown
  results.forEach((r, i) => {
    const names = [
      "Mexico Headlines",
      "Spanish Headlines",
      "Mexico Everything",
      "World Everything",
      "GNews",
    ];
    if (r.length > 0) log.info(`  ${names[i]}: ${r.length} articles`);
  });

  const unique = deduplicateArticles(allArticles);
  log.info(`After deduplication: ${unique.length} articles`);

  if (unique.length === 0) {
    log.error("No articles collected from any source!");
    log.error(
      "Check: Is your NEWSAPI_KEY valid? Free tier only works from localhost."
    );
    log.error(
      "Tip: Try opening this in your browser to test your key:"
    );
    log.error(
      `  https://newsapi.org/v2/top-headlines?country=mx&pageSize=5&apiKey=${ENV.NEWSAPI_KEY.slice(0, 8)}...`
    );
    throw new Error("News collection failed: no articles from any source");
  }

  return unique;
}
