#!/usr/bin/env bun
import { runParseCommand } from "./cli-parse";
import { VEXKIT_VERSION } from "./index";

async function printUsage(): Promise<void> {
  await Bun.write(
    Bun.stdout,
    `vexkit ${VEXKIT_VERSION}\n\nUsage:\n  vexkit              Show version\n  vexkit parse [--json] <file|->   Parse and validate (.vex); use - for stdin\n`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    await Bun.write(Bun.stdout, `vexkit ${VEXKIT_VERSION}\n`);
    return;
  }

  const sub = argv[0];
  if (sub === "parse") {
    await runParseCommand(argv.slice(1));
    return;
  }

  if (sub === "--help" || sub === "-h") {
    await printUsage();
    return;
  }

  await Bun.write(Bun.stderr, `Unknown command: ${sub}\n`);
  await printUsage();
  process.exitCode = 1;
}

await main();
