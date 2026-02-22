#!/usr/bin/env bun
import { colors } from "./constants";
import { closeReadline } from "./prompts";
import { main } from "./cli";

main().catch((err: Error) => {
  closeReadline();
  console.error(colors.red(colors.bold("Error:")), colors.red(String(err)));
  process.exit(1);
});
