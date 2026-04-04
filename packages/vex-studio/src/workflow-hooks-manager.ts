import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HOOK_SCRIPT_PATH = ".cursor/hooks/vex-step-guard.sh";
const HOOKS_JSON_PATH = ".cursor/hooks.json";

const VEX_HOOK_ENTRIES = [
  { command: HOOK_SCRIPT_PATH, matcher: "Write" },
  { command: HOOK_SCRIPT_PATH, matcher: "Delete" },
  { command: HOOK_SCRIPT_PATH, matcher: "Shell" },
] as const;

type HookEntry = { command: string; matcher: string };
type HooksJson = {
  hooks: {
    postToolUse?: HookEntry[];
    preToolUse?: HookEntry[];
    stop?: HookEntry[];
  };
  version: number;
};

export function installHooks(workspaceRoot: string): void {
  writeHookScript(workspaceRoot);
  mergeHooksJson(workspaceRoot);
}

export function uninstallHooks(workspaceRoot: string): void {
  removeHookScript(workspaceRoot);
  unmergeHooksJson(workspaceRoot);
}

function writeHookScript(workspaceRoot: string): void {
  const filePath = join(workspaceRoot, HOOK_SCRIPT_PATH);
  mkdirSync(join(workspaceRoot, ".cursor", "hooks"), { recursive: true });
  writeFileSync(filePath, HOOK_SCRIPT_CONTENT, { mode: 0o755 });
}

function removeHookScript(workspaceRoot: string): void {
  const filePath = join(workspaceRoot, HOOK_SCRIPT_PATH);
  try {
    unlinkSync(filePath);
  } catch {
    /* may not exist */
  }
}

function readHooksJson(workspaceRoot: string): HooksJson {
  const filePath = join(workspaceRoot, HOOKS_JSON_PATH);
  if (!existsSync(filePath)) {
    return { hooks: { preToolUse: [] }, version: 1 };
  }
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as HooksJson;
}

function writeHooksJson(workspaceRoot: string, data: HooksJson): void {
  const filePath = join(workspaceRoot, HOOKS_JSON_PATH);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function isVexEntry(entry: HookEntry): boolean {
  return entry.command === HOOK_SCRIPT_PATH;
}

function mergeHooksJson(workspaceRoot: string): void {
  const data = readHooksJson(workspaceRoot);
  const existing = data.hooks.preToolUse ?? [];
  const alreadyInstalled = existing.some(isVexEntry);
  if (alreadyInstalled) {
    return;
  }
  data.hooks.preToolUse = [...VEX_HOOK_ENTRIES, ...existing];
  writeHooksJson(workspaceRoot, data);
}

function unmergeHooksJson(workspaceRoot: string): void {
  const filePath = join(workspaceRoot, HOOKS_JSON_PATH);
  if (!existsSync(filePath)) {
    return;
  }
  const data = readHooksJson(workspaceRoot);
  const existing = data.hooks.preToolUse ?? [];
  data.hooks.preToolUse = existing.filter((e) => !isVexEntry(e));
  writeHooksJson(workspaceRoot, data);
}

const HOOK_SCRIPT_CONTENT = `#!/usr/bin/env bash
set -uo pipefail

INPUT=$(cat)

REPO_ROOT=$(echo "$INPUT" | jq -r '.workspace_roots[0] // empty')
[ -z "$REPO_ROOT" ] && echo '{"permission": "allow"}' && exit 0

STATE_FILE="$REPO_ROOT/.vex-workflow"

if [ ! -f "$STATE_FILE" ]; then
  echo '{"permission": "allow"}'
  exit 0
fi

ENABLED=$(jq -r '.enabled // false' "$STATE_FILE" 2>/dev/null)
STEP=$(jq -r '.step // -1' "$STATE_FILE" 2>/dev/null)

if [ "$ENABLED" != "true" ]; then
  echo '{"permission": "allow"}'
  exit 0
fi

TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Describe step — block everything except the .vex-advance signal
if [ "$STEP" = "0" ]; then
  BASENAME=$(basename "$FILE")
  if [ "$TOOL" = "Write" ] && [ "$BASENAME" = ".vex-advance" ]; then
    ACTIVE_ID=$(jq -r '.activeId // ""' "$STATE_FILE" 2>/dev/null)
    printf '{"step":1,"enabled":true,"activeId":"%s"}' "$ACTIVE_ID" > "$STATE_FILE"

    AGENT_MSG="The workflow has advanced to the **Spec** step (Step 2 of 6). The .vex-advance file was intercepted — no file was created. You will receive updated instructions for the Spec step in your next context."
    echo "{\\"permission\\": \\"deny\\", \\"agent_message\\": $(echo "$AGENT_MSG" | jq -Rs .)}"
    exit 2
  fi

  AGENT_MSG="You are in the **Describe** step of the Vex workflow. You have NO write access. Do not create, modify, or delete files. Do not run shell commands. Focus on understanding the user's requirements and asking clarifying questions. When you are ready to proceed, write the file \\\`.vex-advance\\\` with the content \\\`spec\\\`."
  USER_MSG="Blocked: agent attempted to use $TOOL during the Describe step (no write access)."
  echo "{\\"permission\\": \\"deny\\", \\"agent_message\\": $(echo "$AGENT_MSG" | jq -Rs .), \\"user_message\\": $(echo "$USER_MSG" | jq -Rs .)}"
  exit 2
fi

echo '{"permission": "allow"}'
`;
