import { resolve } from "path";
import type { ProjectConfig } from "../types";
import { applyDeployCi } from "./ci";
import { applyStrictEslint } from "./eslint";
import { transformAllPackages } from "./package";
import { transformSourceFiles } from "./source";

const SPEC_FIRST_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-first.mdc");
const SPEC_CHECK_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-check.sh");
const SPEC_MARKER_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-marker.sh");
const SPEC_DELETE_GUARD_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-delete-guard.sh");
const SPEC_LINT_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/spec-lint.sh");
const ESLINT_GUARD_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/eslint-guard.sh");
const TSCONFIG_GUARD_TEMPLATE = resolve(import.meta.dir, "../templates/cursor/tsconfig-guard.sh");

interface HookEntry {
  command: string;
  matcher?: string;
}

interface HooksJson {
  version: number;
  hooks: {
    postToolUse: readonly HookEntry[];
    preToolUse?: readonly HookEntry[];
  };
}

const isHookEntry = (value: unknown): value is HookEntry => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  return typeof obj["command"] === "string" && (obj["matcher"] === undefined || typeof obj["matcher"] === "string");
};

const isHooksJson = (value: unknown): value is HooksJson => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (typeof obj["version"] !== "number") return false;
  if (typeof obj["hooks"] !== "object" || obj["hooks"] === null) return false;
  const hooks = obj["hooks"];
  return Array.isArray(hooks["postToolUse"]) && hooks["postToolUse"].every(isHookEntry);
};

const SPEC_FIRST_PRE_TOOL_USE = [
  { command: ".cursor/hooks/eslint-guard.sh", matcher: "Write" },
  { command: ".cursor/hooks/tsconfig-guard.sh", matcher: "Write" },
  { command: ".cursor/hooks/tsconfig-guard.sh", matcher: "Delete" },
  { command: ".cursor/hooks/spec-check.sh", matcher: "Write" },
  { command: ".cursor/hooks/spec-lint.sh", matcher: "Write" },
  { command: ".cursor/hooks/spec-delete-guard.sh", matcher: "Delete" },
] as const satisfies readonly HookEntry[];

const SPEC_FIRST_POST_TOOL_USE = [
  { command: ".cursor/hooks/prettier.sh", matcher: "Write" },
  { command: ".cursor/hooks/eslint.sh", matcher: "Write" },
  { command: ".cursor/hooks/typecheck.sh", matcher: "Write" },
  { command: ".cursor/hooks/jscpd.sh", matcher: "Write" },
  { command: ".cursor/hooks/spec-marker.sh", matcher: "Write" },
] as const satisfies readonly HookEntry[];

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

  const markerDest = resolve(config.targetDir, ".cursor", "hooks", "spec-marker.sh");
  await Bun.write(markerDest, Bun.file(SPEC_MARKER_TEMPLATE));

  const deleteGuardDest = resolve(config.targetDir, ".cursor", "hooks", "spec-delete-guard.sh");
  await Bun.write(deleteGuardDest, Bun.file(SPEC_DELETE_GUARD_TEMPLATE));

  const eslintGuardDest = resolve(config.targetDir, ".cursor", "hooks", "eslint-guard.sh");
  await Bun.write(eslintGuardDest, Bun.file(ESLINT_GUARD_TEMPLATE));

  const tsconfigGuardDest = resolve(config.targetDir, ".cursor", "hooks", "tsconfig-guard.sh");
  await Bun.write(tsconfigGuardDest, Bun.file(TSCONFIG_GUARD_TEMPLATE));

  await Bun.write(resolve(config.targetDir, ".spec-pending"), "");

  const hooksJsonPath = resolve(config.targetDir, ".cursor", "hooks.json");
  const parsed: unknown = JSON.parse(await Bun.file(hooksJsonPath).text());

  if (!isHooksJson(parsed)) {
    throw new Error(`Invalid hooks.json structure at ${hooksJsonPath}`);
  }

  parsed.hooks.preToolUse = SPEC_FIRST_PRE_TOOL_USE;
  parsed.hooks.postToolUse = SPEC_FIRST_POST_TOOL_USE;

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
