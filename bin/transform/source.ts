import { readdirSync, type Dirent } from "fs";
import { join, resolve } from "path";
import type { ProjectConfig } from "../types";

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs)$/;

const replaceInDirectory = async (dir: string, newPrefix: string): Promise<void> => {
  const entries: Dirent[] = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and dist
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      await replaceInDirectory(fullPath, newPrefix);
    } else {
      if (!SOURCE_EXTENSIONS.test(entry.name)) continue;

      const content = await Bun.file(fullPath).text();
      const replaced = content.replace(/(["'])@vex-app\//g, `$1${newPrefix}`);

      if (replaced !== content) {
        await Bun.write(fullPath, replaced);
      }
    }
  }
};

export async function transformSourceFiles(config: ProjectConfig): Promise<void> {
  const newPrefix = `@${config.name}/`;

  await replaceInDirectory(resolve(config.targetDir, "backend"), newPrefix);
  await replaceInDirectory(resolve(config.targetDir, "frontend"), newPrefix);
}
