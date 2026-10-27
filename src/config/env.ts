import * as z from 'zod/mini';

const optionalTrimmed = (fallback: string) =>
  z._default(z.optional(z.string().check(z.trim())), fallback);

const envSchema = z.object({
  VITE_GEMINI_API_KEY: optionalTrimmed(''),
  VITE_GEMINI_MODEL: optionalTrimmed('gemini-3.8-flash'),
  VITE_IDEA_SOURCE: z._default(z.optional(z.enum(['gemini', 'fixtures'])), 'gemini'),
  /** Bundled into the public site on purpose; without it, photos come from Wikipedia only. */
  VITE_PEXELS_API_KEY: optionalTrimmed(''),
});

export type Env = z.infer<typeof envSchema>;

/** Validated build-time configuration. Set in .env.local (see README). */
export const env: Env = envSchema.parse(import.meta.env);
