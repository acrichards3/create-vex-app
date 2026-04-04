import { execFile } from "node:child_process";
import { resolve } from "node:path";
import type { ExtensionContext } from "vscode";

export type ComposerTab = {
  composerId: string;
  name: string;
};

export type ComposerState = {
  activeId: string | null;
  tabs: ComposerTab[];
};

type ComposerDataRaw = {
  allComposers?: unknown[];
  lastFocusedComposerIds?: string[];
  selectedComposerIds?: string[];
};

function isComposerDataRaw(value: unknown): value is ComposerDataRaw {
  return typeof value === "object" && value !== null;
}

function resolveDbPath(context: ExtensionContext): string {
  const storageUri = context.storageUri;
  if (storageUri == null) {
    return "";
  }
  return resolve(storageUri.fsPath, "..", "state.vscdb");
}

function queryDb(dbPath: string): Promise<string> {
  return new Promise((res, rej) => {
    const query = "SELECT value FROM ItemTable WHERE key='composer.composerData'";
    execFile("/usr/bin/sqlite3", [dbPath, query], { timeout: 5000 }, (err, stdout) => {
      if (err != null) {
        rej(err);
        return;
      }
      res(stdout.trim());
    });
  });
}

function parseComposerData(raw: string): ComposerState {
  const empty: ComposerState = { activeId: null, tabs: [] };
  if (raw.length === 0) {
    return empty;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!isComposerDataRaw(parsed)) {
    return empty;
  }
  const selectedIds = Array.isArray(parsed.selectedComposerIds) ? (parsed.selectedComposerIds as string[]) : [];
  const focusedIds = Array.isArray(parsed.lastFocusedComposerIds) ? (parsed.lastFocusedComposerIds as string[]) : [];
  const allComposers = Array.isArray(parsed.allComposers) ? parsed.allComposers : [];

  const selectedSet = new Set(selectedIds);
  const tabs: ComposerTab[] = [];
  allComposers.forEach((c) => {
    if (typeof c !== "object" || c === null) {
      return;
    }
    const obj = c as Record<string, unknown>;
    if (typeof obj["composerId"] !== "string") {
      return;
    }
    if (!selectedSet.has(obj["composerId"])) {
      return;
    }
    const name = typeof obj["name"] === "string" ? obj["name"] : "";
    tabs.push({ composerId: obj["composerId"], name });
  });

  let activeId: string | null = null;
  if (focusedIds.length > 0) {
    activeId = focusedIds[0];
  } else if (selectedIds.length > 0) {
    activeId = selectedIds[0];
  }

  return { activeId, tabs };
}

export async function readComposerState(context: ExtensionContext): Promise<ComposerState> {
  const empty: ComposerState = { activeId: null, tabs: [] };
  const dbPath = resolveDbPath(context);
  if (dbPath.length === 0) {
    return empty;
  }
  const raw = await queryDb(dbPath);
  return parseComposerData(raw);
}
