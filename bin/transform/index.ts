import { resolve } from "path";
import type { ProjectConfig } from "../types";
import { applyGithubCi } from "./ci";
import { applyStrictEslint } from "./eslint";
import { transformAllPackages } from "./package";
import { transformSourceFiles } from "./source";

const ESLINT_GUARD_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/eslint-guard.sh");
const TSCONFIG_GUARD_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/tsconfig-guard.sh");

const makeHooksExecutable = (config: ProjectConfig): void => {
  const hooksDir = resolve(config.targetDir, ".cursor", "hooks");

  try {
    const glob = new Bun.Glob("*.sh");
    const matches = glob.scanSync({ cwd: hooksDir });
    for (const name of matches) {
      Bun.spawnSync(["chmod", "+x", resolve(hooksDir, name)]);
    }
  } catch {
    // hooks dir missing (e.g. user removed .cursor)
  }
};

const applyGuardHooks = async (config: ProjectConfig): Promise<void> => {
  const eslintGuardDest = resolve(config.targetDir, ".cursor", "hooks", "eslint-guard.sh");
  await Bun.write(eslintGuardDest, Bun.file(ESLINT_GUARD_TEMPLATE));

  const tsconfigGuardDest = resolve(config.targetDir, ".cursor", "hooks", "tsconfig-guard.sh");
  await Bun.write(tsconfigGuardDest, Bun.file(TSCONFIG_GUARD_TEMPLATE));
};

export const transformProject = async (config: ProjectConfig): Promise<void> => {
  await transformAllPackages(config);
  await transformSourceFiles(config);
  await applyStrictEslint(config);
  await applyGithubCi(config);
  await applyGuardHooks(config);
  makeHooksExecutable(config);
};
