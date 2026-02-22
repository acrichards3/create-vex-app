#!/usr/bin/env bun
import { resolve } from "path";
import type { Subprocess } from "bun";

const colors = {
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
} as const;

const rootDir = resolve(import.meta.dir, "..");

interface ServiceConfig {
  emoji: string;
  color: (s: string) => string;
  name: string;
  port: string | null;
}

// Colors and labels for each service
const services = {
  frontend: {
    emoji: "⚛️",
    color: colors.cyan,
    name: "Frontend",
    port: "5173",
  },
  lib: {
    emoji: "📦",
    color: colors.yellow,
    name: "Lib",
    port: null,
  },
  backend: {
    emoji: "🚀",
    color: colors.green,
    name: "Backend",
    port: "3000",
  },
} as const satisfies Record<string, ServiceConfig>;

// Spawn a process and prefix its output
function spawnWithLabel(service: string, command: string[], cwd: string): Subprocess {
  const config = services[service];
  const label = colors.bold(config.color(`[${config.emoji} ${config.name}]`));

  console.log(`${label} ${colors.gray(`Starting ${config.name.toLowerCase()}...`)}`);

  const proc = Bun.spawn(command, {
    cwd,
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  });

  // Prefix stdout
  (async () => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          console.log(`${label} ${line}`);
        }
      }
    }

    if (buffer.trim()) {
      console.log(`${label} ${buffer}`);
    }
  })();

  // Prefix stderr
  (async () => {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          console.log(`${label} ${colors.red(line)}`);
        }
      }
    }

    if (buffer.trim()) {
      console.log(`${label} ${colors.red(buffer)}`);
    }
  })();

  return proc;
}

// Start all services
console.log();
console.log(colors.bold(colors.blue("╔════════════════════════════════════════╗")));
console.log(colors.bold(colors.blue("║   Starting Development Servers         ║")));
console.log(colors.bold(colors.blue("╚════════════════════════════════════════╝")));
console.log();

// Start lib (TypeScript watch)
const libProc = spawnWithLabel("lib", ["bun", "run", "dev"], resolve(rootDir, "lib"));

// Start backend
const backendProc = spawnWithLabel("backend", ["bun", "run", "dev"], resolve(rootDir, "backend"));

// Start frontend
const frontendProc = spawnWithLabel("frontend", ["bun", "run", "dev"], resolve(rootDir, "frontend"));

// Wait a moment for services to start, then show status
setTimeout(() => {
  console.log();
  console.log(colors.bold(colors.green("✓ All services started!")));
  console.log();
  console.log(colors.bold("Services running:"));
  console.log(
    `  ${services.frontend.emoji}  ${colors.bold(colors.cyan("Frontend"))}  → http://localhost:${services.frontend.port}`,
  );
  console.log(
    `  ${services.backend.emoji} ${colors.bold(colors.green("Backend"))}  → http://localhost:${services.backend.port}`,
  );
  console.log(`  ${services.lib.emoji} ${colors.bold(colors.yellow("Lib"))}      → Watching for changes`);
  console.log();
  console.log(colors.gray("Press Ctrl+C to stop all services"));
  console.log();
}, 2000);

// Handle cleanup on exit
process.on("SIGINT", () => {
  console.log();
  console.log(colors.yellow("Stopping all services..."));
  libProc.kill();
  backendProc.kill();
  frontendProc.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  libProc.kill();
  backendProc.kill();
  frontendProc.kill();
  process.exit(0);
});
