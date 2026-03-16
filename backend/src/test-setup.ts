import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
import { raise, tryCatchAsync } from "@vex-app/lib";
import { readdirSync } from "fs";
import { resolve } from "path";

Object.assign(Bun.env, {
  AUTH_SECRET: "test-secret-for-testing-only",
  DATABASE_URL: "postgres://postgres:test@localhost:5433/test",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
});

const migrationsFolder = resolve(import.meta.dir, "db/migrations");
const migrationFiles = readdirSync(migrationsFolder).filter((f) => f.endsWith(".sql"));

if (migrationFiles.length === 0) {
  process.stderr.write(
    "\n[test-setup] No migration files found in backend/src/db/migrations/\n" +
      "Run `bun run db:generate` first to generate the initial migration, then re-run tests.\n\n",
  );
  process.exit(1);
}

const client = new SQL(Bun.env.DATABASE_URL ?? raise("DATABASE_URL not set"));

const [, pingError] = await tryCatchAsync(async (): Promise<void> => {
  await client`SELECT 1`;
});
if (pingError !== null) {
  process.stderr.write(
    "\n[test-setup] Could not connect to the test database.\n" +
      "Make sure the Docker test container is running: bun run test:db:up\n" +
      `Details: ${pingError.message}\n\n`,
  );
  process.exit(1);
}

const db = drizzle({ client });

await migrate(db, { migrationsFolder });
await client.end();
