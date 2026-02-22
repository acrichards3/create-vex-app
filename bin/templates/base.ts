import { readdirSync, mkdirSync } from "fs";
import { resolve } from "path";
import { colors } from "../constants";
import type { ProjectConfig } from "../types";
import { copyRecursive } from "../utils/copy";

// Template root is the package root (parent of bin/)
const templateRoot = resolve(import.meta.dir, "../..");

export const copyBaseTemplate = async (config: ProjectConfig): Promise<void> => {
  // Check if target directory exists and is not empty
  const targetExists = await Bun.file(config.targetDir).exists();

  if (targetExists) {
    const contents = readdirSync(config.targetDir);
    if (contents.length > 0) {
      console.error(colors.red(colors.bold(`Error: directory "${config.name}" already exists and is not empty.`)));
      process.exit(1);
    }
  } else {
    mkdirSync(config.targetDir, { recursive: true });
  }

  // Copy all template files
  await copyRecursive(templateRoot, config.targetDir, config);
};
