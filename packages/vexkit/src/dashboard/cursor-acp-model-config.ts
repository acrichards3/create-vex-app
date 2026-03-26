import { tryCatchAsync } from "@vex-app/lib";
import { isRecord } from "./dashboard-helpers.js";

function collectModelOptionValues(rawOptions: unknown): Set<string> {
  const optionValues = new Set<string>();
  if (!Array.isArray(rawOptions)) {
    return optionValues;
  }
  for (let i = 0; i < rawOptions.length; i += 1) {
    const o = rawOptions[i];
    if (!isRecord(o)) {
      continue;
    }
    const v = o.value;
    if (typeof v === "string" && v.length > 0) {
      optionValues.add(v);
    }
  }
  return optionValues;
}

function isModelConfigItem(item: Record<string, unknown>): boolean {
  const id = item.id;
  if (id === "model") {
    return true;
  }
  const category = item.category;
  return typeof category === "string" && category.length > 0 && category.toLowerCase() === "model";
}

export type ModelConfigPick = {
  configId: string;
  found: boolean;
  optionValues: Set<string>;
};

export function pickModelConfigFromSessionResult(sessionResult: Record<string, unknown>): ModelConfigPick {
  let out: ModelConfigPick = { configId: "", found: false, optionValues: new Set() };
  const configOptions = sessionResult.configOptions;
  if (Array.isArray(configOptions)) {
    for (let i = 0; i < configOptions.length; i += 1) {
      const item = configOptions[i];
      if (!isRecord(item)) {
        continue;
      }
      if (!isModelConfigItem(item)) {
        continue;
      }
      const id = item.id;
      if (typeof id !== "string" || id.length === 0) {
        continue;
      }
      out = {
        configId: id,
        found: true,
        optionValues: collectModelOptionValues(item.options),
      };
      break;
    }
  }
  return out;
}

export type ModelValuePick = { found: boolean; value: string };

export function resolveModelValueForConfig(wanted: string, optionValues: Set<string>): ModelValuePick {
  let out: ModelValuePick = { found: false, value: "" };
  if (optionValues.has(wanted)) {
    out = { found: true, value: wanted };
  } else {
    const lower = wanted.toLowerCase();
    const matched = Array.from(optionValues).find((v) => v.toLowerCase() === lower);
    if (matched != null) {
      out = { found: true, value: matched };
    }
  }
  return out;
}

export async function trySetSessionModelFromAcpConfig(input: {
  log: (msg: string) => void;
  modelWanted: string | null;
  sendRequest: (method: string, params: unknown) => Promise<unknown>;
  sessionId: string;
  sessionResult: Record<string, unknown>;
}): Promise<void> {
  const { log, modelWanted, sendRequest, sessionId, sessionResult } = input;
  if (modelWanted == null) {
    return;
  }
  if (modelWanted.length === 0) {
    return;
  }
  if (modelWanted.toLowerCase() === "auto") {
    return;
  }
  const modelCfg = pickModelConfigFromSessionResult(sessionResult);
  if (!modelCfg.found || modelCfg.optionValues.size === 0) {
    return;
  }
  const resolvedPick = resolveModelValueForConfig(modelWanted, modelCfg.optionValues);
  if (!resolvedPick.found) {
    return;
  }
  const resolved = resolvedPick.value;
  const [, setErr] = await tryCatchAsync(async () =>
    sendRequest("session/set_config_option", {
      configId: modelCfg.configId,
      sessionId,
      value: resolved,
    }),
  );
  if (setErr != null) {
    log(`session/set_config_option failed (continuing with CLI model): ${setErr.message}`);
    return;
  }
  log(`session/set_config_option model=${resolved}`);
}
