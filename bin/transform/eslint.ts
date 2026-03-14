import { resolve } from "path";
import { mkdirSync } from "fs";
import type { ProjectConfig, PackageJson } from "../types";

const STRICT_ESLINT_DIR = resolve(import.meta.dir, "../templates/eslint");
const ESLINT_RULES_DIR = resolve(import.meta.dir, "../templates/eslint-rules");

const EXTRA_DEV_DEPS: Record<string, string> = {
  "@typescript-eslint/eslint-plugin": "^8",
  "@typescript-eslint/parser": "^8",
  eslint: "^9",
  "eslint-plugin-perfectionist": "^5",
  "eslint-plugin-sonarjs": "^4",
  "eslint-plugin-unicorn": "^63",
};

const WORKSPACE_CONFIGS: Array<{ eslintTemplate: string; workspace: string }> = [
  { eslintTemplate: "frontend.eslint.config.js", workspace: "frontend" },
  { eslintTemplate: "backend.eslint.config.js", workspace: "backend" },
  { eslintTemplate: "lib.eslint.config.js", workspace: "lib" },
];

const WORKSPACES_WITH_CUSTOM_RULES = ["backend", "lib"] as const satisfies readonly string[];

async function overwriteEslintConfig(targetDir: string, workspace: string, templateName: string): Promise<void> {
  const src = resolve(STRICT_ESLINT_DIR, templateName);
  const dest = resolve(targetDir, workspace, "eslint.config.js");
  await Bun.write(dest, Bun.file(src));
}

async function copyEslintRules(targetDir: string, workspace: string): Promise<void> {
  const rulesDestDir = resolve(targetDir, workspace, "eslint-rules");
  mkdirSync(rulesDestDir, { recursive: true });
  const src = resolve(ESLINT_RULES_DIR, "describe-structure.js");
  const dest = resolve(rulesDestDir, "describe-structure.js");
  await Bun.write(dest, Bun.file(src));
}

async function injectDeps(targetDir: string, workspace: string): Promise<void> {
  const pkgPath = resolve(targetDir, workspace, "package.json");
  const pkgFile = Bun.file(pkgPath);

  if (!(await pkgFile.exists())) {
    return;
  }

  const pkg: PackageJson = await pkgFile.json();
  const devDeps = pkg.devDependencies ?? {};

  const merged = { ...devDeps, ...EXTRA_DEV_DEPS };
  const sorted = Object.fromEntries(Object.entries(merged).toSorted(([a], [b]) => a.localeCompare(b)));

  pkg.devDependencies = sorted;

  const removeDeps = ["eslint-plugin-sort-keys", "eslint-plugin-typescript-sort-keys"];
  removeDeps.forEach((dep) => {
    delete pkg.devDependencies?.[dep];
  });

  await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

export async function applyStrictEslint(config: ProjectConfig): Promise<void> {
  if (!config.includeAiSettings) {
    return;
  }

  const tasks = WORKSPACE_CONFIGS.map(async ({ eslintTemplate, workspace }) => {
    await overwriteEslintConfig(config.targetDir, workspace, eslintTemplate);
    await injectDeps(config.targetDir, workspace);
    if (WORKSPACES_WITH_CUSTOM_RULES.includes(workspace)) {
      await copyEslintRules(config.targetDir, workspace);
    }
  });

  await Promise.all(tasks);

  const rootPkgPath = resolve(config.targetDir, "package.json");
  const rootPkgFile = Bun.file(rootPkgPath);

  if (await rootPkgFile.exists()) {
    const pkg: PackageJson = await rootPkgFile.json();
    const devDeps = pkg.devDependencies ?? {};
    delete devDeps["eslint-plugin-sort-keys"];
    delete devDeps["eslint-plugin-typescript-sort-keys"];
    pkg.devDependencies = devDeps;
    await Bun.write(rootPkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}
