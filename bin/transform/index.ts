import type { ProjectConfig } from "../types";
import { transformAllPackages } from "./package";
import { transformSourceFiles } from "./source";

export const transformProject = async (config: ProjectConfig): Promise<void> => {
  // Update all package.json files with new project name
  await transformAllPackages(config);

  // Update import statements in source files
  await transformSourceFiles(config);
};
