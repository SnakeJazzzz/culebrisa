/**
 * Prompt Generator Module
 *
 * Uses Claude API to generate image and video prompts for each news,
 * applying the Snake Universe creative filter.
 *
 * Requirements covered: PG-001 through PG-006
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../lib/config.ts";
import { createLogger } from "../lib/logger.ts";
import { parseClaudeJSON } from "../lib/parse-json.ts";
import type { SelectedNews, VisualPrompts } from "../lib/types.ts";

const log = createLogger("PromptGenerator");

const client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });

const SNAKE_UNIVERSE_PROMPT = `Eres un director de arte para "Culebrisa", un noticiero del universo reptil. Tu trabajo es crear prompts para generar 2 imagenes por noticia con IA.

CONCEPTO: Cada noticia tiene 2 imagenes que cuentan una mini-historia visual:
- IMAGEN 1 (inicio): Muestra la situacion o contexto de la noticia. El "que paso".
- IMAGEN 2 (desarrollo): Muestra la consecuencia, reaccion o evolucion. El "que sigue" o "como reacciono el mundo".

REGLAS DEL UNIVERSO SERPIENTE (CRITICO):
Todas las imagenes existen en un mundo donde las serpientes son la especie dominante:
- Personas/politicos = serpientes antropomorficas con vestimenta/rasgos reconocibles
- Dinero/monedas = billetes con rostros de serpientes, monedas con escamas
- Edificios = arquitectura con formas ondulantes y texturas de escamas
- Vehiculos/misiles = formas alargadas y serpentinas
- Multitudes = grupos de serpientes de diferentes especies
- Tecnologia = dispositivos con patrones de escamas, cables como serpientes
- Naturaleza/clima = fenomenos formados por serpientes
- Deportes = serpientes jugando/compitiendo

ESTILO VISUAL:
- Semi-realista, colores vibrantes (verdes, dorados, tonos oscuros)
- Iluminacion dramatica y cinematica
- Formato vertical (9:16 / 1080x1920)
- Divertido y creativo: transforma los elementos de la noticia de forma ingeniosa al universo serpiente

FORMATO DE RESPUESTA:
Responde UNICAMENTE con JSON valido (sin markdown, sin backticks):
{
  "prompts": [
    {
      "news_index": 0,
      "image_prompt_start": "Prompt for the opening scene...",
      "image_prompt_develop": "Prompt for the development/reaction scene..."
    }
  ]
}

REGLAS PARA PROMPTS:
- Cada prompt: 2-3 oraciones en INGLES, describiendo la escena. Incluir composicion, iluminacion, y estilo.
- Las 2 imagenes deben sentirse como parte de la misma historia pero mostrar momentos diferentes.
- Ser creativo y divertido con la transformacion al universo serpiente.`;

export async function generatePrompts(
  selectedNews: SelectedNews[]
): Promise<VisualPrompts[]> {
  log.info(`Generating visual prompts for ${selectedNews.length} news...`);

  const newsContext = selectedNews
    .map(
      (s, i) =>
        `Noticia ${i} (${s.layout}):\n` +
        `  Titulo: ${s.article.title}\n` +
        `  Descripcion: ${s.article.description}\n` +
        `  Categoria: ${s.article.category}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Genera prompts visuales (Universo Serpiente) para estas noticias:\n\n${newsContext}`,
      },
    ],
    system: SNAKE_UNIVERSE_PROMPT,
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  log.debug("Prompts response", responseText);

  let parsed: { prompts: VisualPrompts[] };
  try {
    parsed = parseClaudeJSON(responseText);
  } catch {
    log.error("Failed to parse prompts JSON", responseText);
    throw new Error("Prompt generation failed: invalid JSON from Claude");
  }

  log.info(`Generated ${parsed.prompts.length} visual prompts (2 images each)`);
  parsed.prompts.forEach((p) => {
    log.info(`  News ${p.news_index}: start (${p.image_prompt_start.length} chars), develop (${p.image_prompt_develop.length} chars)`);
  });

  return parsed.prompts;
}
