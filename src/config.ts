import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  PAYMENTS_BASE_URL: z.string().url(),
  PAYMENTS_API_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
});

const env = envSchema.parse(process.env);

export const config = {
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  paymentsBaseUrl: env.PAYMENTS_BASE_URL.replace(/\/+$/, ''),
  paymentsApiKey: env.PAYMENTS_API_KEY,
  sessionSecret: env.SESSION_SECRET,
} as const;
