#!/usr/bin/env bash
set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only check .ts files — not .tsx (no UI testing) and not spec files themselves
[[ "$FILE" == *.ts ]] || exit 0
[[ "$FILE" == *.spec.ts ]] && exit 0

# Skip frontend — testing applies to backend and lib only
[[ "$FILE" == */frontend/* ]] && exit 0

# Skip config, generated, and non-source files
[[ "$FILE" == */node_modules/* ]] && exit 0
[[ "$FILE" == *drizzle.config* ]] && exit 0
[[ "$FILE" == *routeTree.gen* ]] && exit 0
[[ "$FILE" == */env/env.ts ]] && exit 0
[[ "$FILE" == */db/index.ts ]] && exit 0

DIR=$(dirname "$FILE")
BASE=$(basename "$FILE" .ts)
SPEC="$DIR/$BASE.spec.ts"

if [ ! -f "$SPEC" ]; then
  REASON=$(printf "No spec file found for %s\n\nA co-located spec file is required at:\n  %s\n\nFollow testing.mdc: write .spec.ts files for all backend controllers, actions, services, and lib utilities using the WHEN/AND/it structure before considering this file complete." "$FILE" "$SPEC" | jq -Rs .)
  echo "{\"decision\": \"deny\", \"reason\": $REASON}"
  exit 2
fi

echo '{"decision": "allow"}'
