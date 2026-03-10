#!/usr/bin/env bash
set -uo pipefail

INPUT=$(cat)

# Collect all files written during this turn
WRITTEN_FILES=$(echo "$INPUT" | jq -r '
  .tool_uses[]?
  | select(.tool_name == "Write" or .tool_name == "EditNotebook")
  | .tool_input.file_path // empty
' 2>/dev/null || true)

# If no TS/TSX files were written, nothing to verify
TS_FILES=$(echo "$WRITTEN_FILES" | grep -E '\.(ts|tsx)$' || true)
[ -n "$TS_FILES" ] || exit 0

# Find the repo root (where package.json with workspaces lives)
REPO_ROOT=""
DIR=$(echo "$TS_FILES" | head -1 | xargs dirname)
while [ "$DIR" != "/" ]; do
  if [ -f "$DIR/package.json" ] && grep -q '"workspaces"' "$DIR/package.json" 2>/dev/null; then
    REPO_ROOT="$DIR"
    break
  fi
  DIR=$(dirname "$DIR")
done

[ -n "$REPO_ROOT" ] || exit 0

cd "$REPO_ROOT"

# --- Step 1: Full cross-package type check ---
TYPECHECK_OUTPUT=$(bun run typecheck 2>&1) || TYPECHECK_FAILED=1

if [ "${TYPECHECK_FAILED:-0}" -eq 1 ] && [ -n "$TYPECHECK_OUTPUT" ]; then
  REASON=$(printf "Type checking failed:\n\n%s" "$TYPECHECK_OUTPUT" | jq -Rs .)
  echo "{\"decision\": \"deny\", \"reason\": $REASON}"
  exit 2
fi

# --- Step 2: Run tests for any spec files co-located with written files ---
SPEC_FILES=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  DIR=$(dirname "$f")
  BASE=$(basename "$f" | sed 's/\.\(ts\|tsx\)$//')
  SPEC="$DIR/$BASE.spec.ts"
  [ -f "$SPEC" ] && SPEC_FILES="$SPEC_FILES $SPEC"
done <<< "$TS_FILES"

SPEC_FILES=$(echo "$SPEC_FILES" | xargs)

if [ -n "$SPEC_FILES" ]; then
  TEST_OUTPUT=$(bun test $SPEC_FILES 2>&1) || TEST_FAILED=1

  if [ "${TEST_FAILED:-0}" -eq 1 ]; then
    REASON=$(printf "Tests failed:\n\n%s" "$TEST_OUTPUT" | jq -Rs .)
    echo "{\"decision\": \"deny\", \"reason\": $REASON}"
    exit 2
  fi
fi

echo '{"decision": "allow"}'
