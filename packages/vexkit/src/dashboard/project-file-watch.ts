import { watch } from "bun:fs";
import { IGNORED_DASHBOARD_DIR_NAMES } from "./ignored-dashboard-dir-names";

function pathContainsIgnoredSegment(relPath: string): boolean {
  const parts = relPath.split(/[/\\]/);
  return parts.some((p) => IGNORED_DASHBOARD_DIR_NAMES.has(p));
}

function isVexRelatedChange(filename: string | Buffer | null): boolean {
  if (filename == null) {
    return true;
  }
  const name = typeof filename === "string" ? filename : filename.toString("utf8");
  const norm = name.replace(/\\/g, "/");
  if (pathContainsIgnoredSegment(norm)) {
    return false;
  }
  return norm.endsWith(".vex");
}

export function startDashboardFileWatch(input: {
  debounceMs: number;
  onDebouncedChange: () => void;
  rootAbs: string;
}): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer != null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      input.onDebouncedChange();
    }, input.debounceMs);
  };

  let watcher: ReturnType<typeof watch> | null = null;
  try {
    watcher = watch(input.rootAbs, { recursive: true }, (_event, filename) => {
      if (!isVexRelatedChange(filename)) {
        return;
      }
      schedule();
    });
  } catch {
    return () => {
      if (timer != null) {
        clearTimeout(timer);
      }
    };
  }

  return () => {
    if (timer != null) {
      clearTimeout(timer);
    }
    watcher.close();
  };
}
