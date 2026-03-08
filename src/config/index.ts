import { config } from 'dotenv';
import { z } from 'zod';

const originalWrite = process.stdout.write;
process.stdout.write = () => true;
config();
process.stdout.write = originalWrite;

const configSchema = z.object({
  THREADS_ACCESS_TOKEN: z.string().min(1, 'Access token is required'),
  THREADS_USER_ID: z.string().optional().default('me'),
  THREADS_API_BASE_URL: z.string().url().default('https://graph.threads.net/v1.0'),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const result = configSchema.safeParse({
    THREADS_ACCESS_TOKEN: process.env.THREADS_ACCESS_TOKEN,
    THREADS_USER_ID: process.env.THREADS_USER_ID,
    THREADS_API_BASE_URL: process.env.THREADS_API_BASE_URL,
  });

  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
