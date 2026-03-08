import { resolve } from "path";
import { colors } from "../constants";
import type { ProjectConfig, PackageJson } from "../types";

export const transformRootPackage = async (config: ProjectConfig): Promise<void> => {
  const pkgPath = resolve(config.targetDir, "package.json");
  const pkgFile = Bun.file(pkgPath);

  if (!(await pkgFile.exists())) {
    console.error(colors.red(colors.bold("Error: package.json not found in target directory")));
    process.exit(1);
  }

  const pkg: PackageJson = await pkgFile.json();
  const newPrefix = `@${config.name}/`;

  // Update root package
  pkg.name = config.name;
  pkg.private = true;
  delete pkg.postinstall;
  delete pkg.bin;
  delete pkg.files;

  // Replace @vex-app/ prefix in scripts
  if (pkg.scripts) {
    for (const key of Object.keys(pkg.scripts)) {
      const script = pkg.scripts[key];
      if (typeof script === "string") {
        pkg.scripts[key] = script.replace(/@vex-app\//g, newPrefix);
      }
    }
  }

  await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
};

export async function transformWorkspacePackage(config: ProjectConfig, workspaceName: string): Promise<void> {
  const pkgPath = resolve(config.targetDir, workspaceName, "package.json");
  const pkgFile = Bun.file(pkgPath);

  if (!(await pkgFile.exists())) return;

  const pkg: PackageJson = await pkgFile.json();
  const newPrefix = `@${config.name}/`;

  // Update package name
  if (pkg.name?.startsWith("@vex-app/")) {
    pkg.name = pkg.name.replace(/@vex-app\//, newPrefix);
  }

  // Update dependencies
  if (pkg.dependencies) {
    for (const dep of Object.keys(pkg.dependencies)) {
      if (dep.startsWith("@vex-app/")) {
        const newDep = dep.replace(/@vex-app\//, newPrefix);
        pkg.dependencies[newDep] = pkg.dependencies[dep];
        delete pkg.dependencies[dep];
      }
    }
  }

  await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

export async function transformAllPackages(config: ProjectConfig): Promise<void> {
  await transformRootPackage(config);
  await transformWorkspacePackage(config, "frontend");
  await transformWorkspacePackage(config, "backend");
  await transformWorkspacePackage(config, "lib");
}
