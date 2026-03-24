import { resolve } from "path";
import type { ProjectConfig } from "../types";

const DEFAULT_CI_TEMPLATE = resolve(import.meta.dir, "../templates/ci/ci-default.yml");
const DEPLOY_CI_TEMPLATE = resolve(import.meta.dir, "../templates/ci/ci.yml");

export const applyGithubCi = async (config: ProjectConfig): Promise<void> => {
  if (!config.includeGithub) {
    return;
  }

  const dest = resolve(config.targetDir, ".github", "workflows", "ci.yml");
  const templatePath = config.includeDeploy ? DEPLOY_CI_TEMPLATE : DEFAULT_CI_TEMPLATE;
  await Bun.write(dest, Bun.file(templatePath));
};
