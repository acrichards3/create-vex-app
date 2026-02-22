import { colors, DEFAULT_PROJECT_NAME } from "../constants";
import { prompt } from "./base";

export const promptProjectName = async (argName: string): Promise<string> => {
  let projectName = argName;

  if (!projectName) {
    const answer = await prompt(colors.cyan(`Project name (${DEFAULT_PROJECT_NAME}): `));
    projectName = answer || DEFAULT_PROJECT_NAME;
  }

  // Sanitize: lowercase, only alphanumeric and hyphens
  projectName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  return projectName || DEFAULT_PROJECT_NAME;
};
