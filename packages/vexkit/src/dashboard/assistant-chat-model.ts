import { isRecord } from "./dashboard-helpers.js";

export const VEXKIT_DASHBOARD_CHAT_MODEL_PRESETS = [
  "auto",
  "composer-2",
  "composer-2-fast",
  "composer-1",
  "gpt-5.2",
  "gpt-4o",
  "claude-4.5-sonnet",
  "claude-4.5-opus",
  "claude-4.6-sonnet",
  "claude-4.6-opus",
] as const;

export function isValidDashboardChatModelId(s: string): boolean {
  if (s.length === 0 || s.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9\s._:@/()+-]+$/.test(s);
}

export type ParsedChatModelField = { error: string | null; model: string | null };

export function parseChatModelFieldFromBody(data: unknown): ParsedChatModelField {
  if (!isRecord(data) || !Object.hasOwn(data, "model")) {
    return { error: null, model: null };
  }
  const m = data.model;
  if (m === null) {
    return { error: null, model: null };
  }
  if (typeof m !== "string") {
    return { error: "Field model must be a string when present.", model: null };
  }
  const trimmed = m.trim();
  if (trimmed.length === 0) {
    return { error: null, model: null };
  }
  if (!isValidDashboardChatModelId(trimmed)) {
    return {
      error: "Invalid model id. Use letters, digits, spaces, and . _ - : / ( ) + only.",
      model: null,
    };
  }
  return { error: null, model: trimmed };
}
