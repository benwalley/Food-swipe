import { GoogleGenAI, type GoogleGenAIInteraction } from '@google/genai';
import { tuning } from '@/config/tuning';
import { renderBrief, type Brief } from '@/domain/brief';
import type { Batch, Dish } from '@/domain/types';
import { newId } from '@/lib/id';
import { isAbortError, IdeaSourceError, type IdeaBatch, type IdeaSource } from '../IdeaSource';
import { toDish } from '../normalize';
import { SYSTEM_INSTRUCTION } from './prompt';
import { aiBatchSchema, aiDishSchema, geminiResponseSchema } from './schema';

interface GeminiConfig {
  apiKey: string;
  model: string;
}

type Interaction = GoogleGenAIInteraction;

/**
 * Asks Gemini for meal ideas from its own knowledge (no web search, so each
 * batch costs a fraction of a cent) and returns validated dishes.
 */
export class GeminiIdeaSource implements IdeaSource {
  readonly label: string;
  private client: GoogleGenAI | null = null;

  constructor(private readonly config: GeminiConfig) {
    this.label = `Gemini (${config.model})`;
  }

  private getClient(): GoogleGenAI {
    if (!this.config.apiKey) {
      throw new IdeaSourceError('config', 'No Gemini API key is configured.');
    }
    this.client ??= new GoogleGenAI({ apiKey: this.config.apiKey });
    return this.client;
  }

  async fetchBatch(brief: Brief, options: { signal?: AbortSignal } = {}): Promise<IdeaBatch> {
    const client = this.getClient();
    const batch: Batch = { id: newId(), meal: brief.meal, requestedAt: new Date().toISOString() };

    let interaction: Interaction;
    try {
      interaction = (await client.interactions.create(
        {
          model: this.config.model,
          system_instruction: SYSTEM_INSTRUCTION,
          input: renderBrief(brief),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: geminiResponseSchema(brief.count),
          },
          generation_config: { thinking_level: 'low' },
          store: false,
        },
        {
          signal: options.signal,
          timeout_ms: tuning.batches.requestTimeoutMs,
          retries: {
            strategy: 'attempt-count-backoff',
            maxRetries: 2,
            retryConnectionErrors: true,
          },
        },
      )) as Interaction;
    } catch (error) {
      throw toIdeaError(error);
    }

    const dishes = parseDishes(interaction.output_text ?? '', brief, batch);
    if (dishes.length === 0) {
      throw new IdeaSourceError('invalid-output', 'Gemini returned no usable dishes.');
    }
    return { batch, dishes };
  }
}

export function parseDishes(outputText: string, brief: Brief, batch: Batch): Dish[] {
  let json: unknown;
  try {
    json = JSON.parse(outputText);
  } catch (error) {
    throw new IdeaSourceError('invalid-output', 'Gemini returned text that is not JSON.', error);
  }
  const envelope = aiBatchSchema.safeParse(json);
  if (!envelope.success)
    throw new IdeaSourceError('invalid-output', 'Gemini returned an unexpected shape.');
  const dishes: Dish[] = [];
  for (const candidate of envelope.data.dishes) {
    const parsed = aiDishSchema.safeParse(candidate);
    if (!parsed.success) continue;
    const dish = toDish(parsed.data, brief, batch);
    if (dish) dishes.push(dish);
  }
  return dishes;
}

function statusOf(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const record = error as Record<string, unknown>;
  const value = record.statusCode ?? record.status;
  return typeof value === 'number' ? value : null;
}

export function toIdeaError(error: unknown): Error {
  if (isAbortError(error) || error instanceof IdeaSourceError) return error as Error;
  const status = statusOf(error);
  const message = error instanceof Error ? error.message : String(error);
  if (status === 401 || status === 403 || (status === 400 && /api.?key/i.test(message))) {
    return new IdeaSourceError('auth', 'The Gemini API key was rejected.', error);
  }
  if (status === 429)
    return new IdeaSourceError('quota', 'Gemini rate limit or quota reached.', error);
  if ((status !== null && status >= 500) || error instanceof TypeError) {
    return new IdeaSourceError('network', 'Could not reach Gemini.', error);
  }
  return new IdeaSourceError('unknown', message || 'Something went wrong fetching ideas.', error);
}
