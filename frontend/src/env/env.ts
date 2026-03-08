/**
 * You probably won't need to touch this file. Edit schema.ts to add or change env variables.
 */
import { raise } from "@vex-app/lib";
import { envSchema } from "./schema";

const result = envSchema.safeParse(import.meta.env);

export const env = result.success ? result.data : raise("Environment validation failed");
