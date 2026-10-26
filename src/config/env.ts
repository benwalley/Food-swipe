import { z } from 'zod';

const envSchema = z.object({
  VITE_GEMINI_API_KEY: z.string().trim().optional().default(''),
  VITE_GEMINI_MODEL: z.string().trim().min(1).optional().default('gemini-3.8-flash'),
  VITE_IDEA_SOURCE: z.enum(['gemini', 'fixtures']).optional().default('gemini'),
});

export type Env = z.infer<typeof envSchema>;

/** Validated build-time configuration. Set in .env.local (see README). */
export const env: Env = envSchema.parse(import.meta.env);
