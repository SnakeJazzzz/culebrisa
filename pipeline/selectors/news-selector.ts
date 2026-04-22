/**
 * News Selector Module
 *
 * Uses Claude API to analyze raw news articles and select
 * exactly 3 for a short video episode (~60s).
 *
 * Requirements covered: NS-001 through NS-006
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../lib/config.ts";
import { createLogger } from "../lib/logger.ts";
import { parseClaudeJSON } from "../lib/parse-json.ts";
import type { RawNewsArticle, SelectedNews } from "../lib/types.ts";

const log = createLogger("NewsSelector");

const client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });

const SELECTION_PROMPT = `Eres el editor de noticias de "Culebrisa", un noticiero digital en formato de video corto (~60 segundos).

Tu trabajo es analizar las noticias del dia y seleccionar EXACTAMENTE 3 para un episodio corto de ~60 segundos.

CRITERIOS DE SELECCION (NS-002):
1. Impacto: noticias que afectan a muchas personas
2. Tendencia: temas que la gente esta comentando en redes
3. Potencial visual: noticias que se pueden representar visualmente de forma interesante
4. Diversidad tematica: mezclar categorias diferentes
5. Relevancia para Mexico: priorizar noticias mexicanas, complementar con internacionales

FORMATO DE RESPUESTA:
Responde UNICAMENTE con un JSON valido (sin markdown, sin backticks, sin comentarios), con esta estructura:
{
  "selected": [
    {
      "index": 0,
      "order": 1,
      "layout": "fullscreen",
      "reason": "Breve justificacion"
    }
  ]
}

REGLAS:
- Selecciona EXACTAMENTE 3 noticias. Ni mas ni menos.
- "index" es la posicion (0-based) del articulo en la lista proporcionada
- "order" es el orden de presentacion (1 = primera noticia, mas impactante)
- "layout" siempre debe ser "fullscreen" (visual ocupa toda la pantalla).
- La primera noticia debe ser la mas impactante
- Mezcla al menos 2 categorias diferentes`;

export async function selectNews(
  articles: RawNewsArticle[]
): Promise<SelectedNews[]> {
  log.info(`Selecting from ${articles.length} articles...`);

  // Prepare article summaries for Claude
  const articleSummaries = articles
    .map(
      (a, i) =>
        `[${i}] "${a.title}" - ${a.source} (${a.category})\n    ${a.description || "Sin descripcion"}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Aqui estan las noticias de hoy. Selecciona las mejores para el episodio:\n\n${articleSummaries}`,
      },
    ],
    system: SELECTION_PROMPT,
  });

  // Extract text from response
  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  log.debug("Claude response", responseText);

  // Parse JSON response
  let parsed: { selected: Array<{ index: number; order: number; layout: string; reason: string }> };
  try {
    parsed = parseClaudeJSON(responseText);
  } catch {
    log.error("Failed to parse Claude response as JSON", responseText);
    throw new Error("News selection failed: invalid JSON from Claude");
  }

  // Map selections back to articles
  const selectedNews: SelectedNews[] = parsed.selected
    .sort((a, b) => a.order - b.order)
    .map((sel) => {
      const article = articles[sel.index];
      if (!article) {
        log.warn(`Invalid article index: ${sel.index}`);
        return null;
      }
      return {
        article,
        order: sel.order,
        layout: sel.layout as "fullscreen" | "monitor",
        reason: sel.reason,
      };
    })
    .filter((s): s is SelectedNews => s !== null);

  // Enforce exactly 3 news
  if (selectedNews.length > 3) {
    log.warn(`Claude selected ${selectedNews.length} news, trimming to 3`);
    selectedNews.splice(3);
  }

  log.info(`Selected ${selectedNews.length} news articles:`);
  selectedNews.forEach((s) =>
    log.info(`  ${s.order}. [${s.layout}] ${s.article.title} - ${s.reason}`)
  );

  return selectedNews;
}
