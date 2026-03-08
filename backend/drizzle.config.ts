import { defineConfig } from "drizzle-kit";
import { raise } from "@vex-app/lib";

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? raise("DATABASE_URL environment variable is not set"),
  },
  dialect: "postgresql",
  out: "./src/db/migrations",
  schema: "./src/db/schema/*",
});
