#!/usr/bin/env bash
set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == */tsconfig*.json || "$FILE" == */tsconfig*.jsonc ]]; then
  BASENAME=$(basename "$FILE")
  AGENT_MSG="You are not allowed to modify or delete TypeScript configuration files ($BASENAME) without explicit user instruction. If you believe a tsconfig change is needed, stop and explain what change you want to make and why. The user will decide whether to approve it."
  USER_MSG="Blocked: agent tried to modify tsconfig file \`$BASENAME\` without permission."
  echo "{\"permission\": \"deny\", \"agent_message\": $(echo "$AGENT_MSG" | jq -Rs .), \"user_message\": $(echo "$USER_MSG" | jq -Rs .)}"
  exit 2
fi

echo '{"permission": "allow"}'
