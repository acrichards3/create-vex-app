import { z } from "zod";

export const envSchema = z.object({
  AUTH_SECRET: z.string().min(1), // Generate with: openssl rand -base64 32
  DATABASE_URL: z.url(),
  ENVIRONMENT: z.enum(["development", "production", "testing"]).default("development"),
  FRONTEND_URL: z.url().default("http://localhost:5173"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  OAUTH_TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(), // Generate with: openssl rand -base64 32
  PORT: z.coerce.number().default(3000),
});

export const validatedEnv = (): z.infer<typeof envSchema> => {
  const result = envSchema.safeParse(Bun.env);

  if (!result.success) {
    process.stderr.write("❌ Invalid Environment Variables\n");
    result.error.issues.forEach((issue) => {
      process.stderr.write(`  ${issue.path.join(".")}: ${issue.message}\n`);
    });
    process.exit(1);
  }

  return result.data;
};

export const env = validatedEnv();
