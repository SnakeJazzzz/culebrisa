/**
 * Script Generator Module
 *
 * Uses Claude API to generate the full episode script
 * with Cobradoriga's personality and tone.
 *
 * Requirements covered: SG-001 through SG-008
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../lib/config.ts";
import { createLogger } from "../lib/logger.ts";
import { parseClaudeJSON } from "../lib/parse-json.ts";
import type { SelectedNews, EpisodeScript } from "../lib/types.ts";

const log = createLogger("ScriptGenerator");

const client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });

const COBRADORIGA_SYSTEM_PROMPT = `Eres Cobradoriga, el presentador estrella de "Culebrisa", el noticiero mas venenoso del mundo reptil.

TU PERSONALIDAD:
- Eres una cobra sarcastica, dramatica y carismatica
- Usas jerga de serpientes naturalmente: "reptiles" (audiencia), "deslizarse" (moverse), "veneno" (contenido fuerte), "muda de piel" (cambio), "madriguera" (casa/lugar), "enrollarse" (descansar)
- Tu tono es informativo pero con humor: sarcastico cuando la noticia lo permite, dramatico cuando es seria, humoristico cuando es ligera
- Hablas en espanol mexicano casual pero articulado
- Tu frase de apertura es variante de "Bienvenidos reptiles a otro venenoso episodio de Culebrisa"
- Tu despedida es variante de "Eso fue todo reptiles, nos vemos manana. Sigan deslizandose"

LIMITES ESTRICTOS DE PALABRAS (OBLIGATORIO - el video dura maximo 60-90 segundos):
- Intro (saludo): 1 oracion corta. MAXIMO 15 palabras.
- Preview de titulares: 1 oracion. MAXIMO 20 palabras.
- Cada noticia: 1-2 oraciones. MAXIMO 30 palabras por noticia. Ve directo al grano.
- Outro (despedida): 1 oracion. MAXIMO 12 palabras.
- TOTAL del guion completo: MAXIMO 140 palabras. Si te pasas, el video no cabe.

REGLAS DEL GUION:
- Se BREVE y CONCISO. Cada palabra cuenta.
- NO inventes datos, basa todo en la informacion proporcionada
- Haz referencias al universo serpiente de forma natural pero NO gastes palabras en ello
- NO uses frases de relleno como "y hablando de eso", "pasando a la siguiente noticia"
- Informa el dato clave de cada noticia en maximo 2 oraciones cortas

FORMATO DE RESPUESTA:
Responde UNICAMENTE con JSON valido (sin markdown, sin backticks, sin comentarios):
{
  "intro": "texto del saludo",
  "headlines_preview": "texto listando titulares brevemente",
  "news_segments": [
    { "narration": "texto de narracion para noticia 1", "news_index": 0 },
    { "narration": "texto de narracion para noticia 2", "news_index": 1 }
  ],
  "outro": "texto de despedida"
}`;

export async function generateScript(
  selectedNews: SelectedNews[]
): Promise<EpisodeScript> {
  log.info(`Generating script for ${selectedNews.length} news...`);

  const newsContext = selectedNews
    .map(
      (s, i) =>
        `Noticia ${i + 1} (orden ${s.order}, layout: ${s.layout}):\n` +
        `  Titulo: ${s.article.title}\n` +
        `  Fuente: ${s.article.source}\n` +
        `  Descripcion: ${s.article.description}\n` +
        `  Contenido: ${s.article.content || "No disponible"}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Genera el guion del episodio de hoy con estas ${selectedNews.length} noticias:\n\n${newsContext}`,
      },
    ],
    system: COBRADORIGA_SYSTEM_PROMPT,
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  log.debug("Script response", responseText);

  let script: EpisodeScript;
  try {
    script = parseClaudeJSON(responseText);
  } catch {
    log.error("Failed to parse script JSON", responseText);
    throw new Error("Script generation failed: invalid JSON from Claude");
  }

  // Validate structure
  if (!script.intro || !script.news_segments || !script.outro) {
    throw new Error("Script generation failed: missing required fields");
  }

  // Log word counts for timing estimation
  const totalWords = [
    script.intro,
    script.headlines_preview,
    ...script.news_segments.map((s) => s.narration),
    script.outro,
  ].join(" ").split(" ").length;

  const estimatedSeconds = totalWords / 2.5;
  log.info(
    `Script generated: ${totalWords} words, ~${estimatedSeconds.toFixed(0)}s estimated`
  );

  if (totalWords > 180) {
    log.warn(
      `Script too long! ${totalWords} words (max 140 target, hard limit 180). ` +
      `Estimated ${estimatedSeconds.toFixed(0)}s — video will exceed 90s.`
    );
  }
  if (totalWords > 200) {
    throw new Error(
      `Script rejected: ${totalWords} words exceeds 200 word hard limit. ` +
      `Re-run pipeline to regenerate.`
    );
  }
  if (estimatedSeconds < 30) {
    log.warn("Script may be too short! Consider expanding.");
  }

  return script;
}
