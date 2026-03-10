import { resolve } from "path";
import type { ProjectConfig } from "../types";
import { applyDeployCi } from "./ci";
import { applyStrictEslint } from "./eslint";
import { transformAllPackages } from "./package";
import { transformSourceFiles } from "./source";

const SPEC_FIRST_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-first.mdc");
const SPEC_CHECK_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-check.sh");

interface HookEntry {
  command: string;
  matcher?: string;
}

interface HooksJson {
  version: number;
  hooks: {
    postToolUse: HookEntry[];
    stopTool?: HookEntry[];
  };
}

const isHookEntry = (value: unknown): value is HookEntry => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj["command"] === "string" &&
    (obj["matcher"] === undefined || typeof obj["matcher"] === "string");
};

const isHooksJson = (value: unknown): value is HooksJson => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj["version"] !== "number") return false;
  if (typeof obj["hooks"] !== "object" || obj["hooks"] === null) return false;
  const hooks = obj["hooks"] as Record<string, unknown>;
  return Array.isArray(hooks["postToolUse"]) && hooks["postToolUse"].every(isHookEntry);
};

const makeHooksExecutable = (config: ProjectConfig): void => {
  const hooksDir = resolve(config.targetDir, ".cursor", "hooks");

  try {
    const glob = new Bun.Glob("*.sh");
    const matches = glob.scanSync({ cwd: hooksDir });
    for (const name of matches) {
      Bun.spawnSync(["chmod", "+x", resolve(hooksDir, name)]);
    }
  } catch {
    // hooks dir doesn't exist (user opted out of AI settings)
  }
};

const applySpecFirst = async (config: ProjectConfig): Promise<void> => {
  if (!config.includeSpecFirst) {
    return;
  }

  const dest = resolve(config.targetDir, ".cursor", "rules", "spec-first.mdc");
  await Bun.write(dest, Bun.file(SPEC_FIRST_TEMPLATE));
};

const applySpecCheck = async (config: ProjectConfig): Promise<void> => {
  if (!config.includeSpecFirst) {
    return;
  }

  const hookDest = resolve(config.targetDir, ".cursor", "hooks", "spec-check.sh");
  await Bun.write(hookDest, Bun.file(SPEC_CHECK_TEMPLATE));

  const hooksJsonPath = resolve(config.targetDir, ".cursor", "hooks.json");
  const parsed: unknown = JSON.parse(await Bun.file(hooksJsonPath).text());

  if (!isHooksJson(parsed)) {
    throw new Error(`Invalid hooks.json structure at ${hooksJsonPath}`);
  }

  parsed.hooks.postToolUse = [
    ...parsed.hooks.postToolUse,
    { command: "./.cursor/hooks/spec-check.sh", matcher: "Write" },
  ];

  await Bun.write(hooksJsonPath, JSON.stringify(parsed, null, 2) + "\n");
};

export const transformProject = async (config: ProjectConfig): Promise<void> => {
  await transformAllPackages(config);
  await transformSourceFiles(config);
  await applyStrictEslint(config);
  await applyDeployCi(config);
  await applySpecFirst(config);
  await applySpecCheck(config);
  makeHooksExecutable(config);
};
