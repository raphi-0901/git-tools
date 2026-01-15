#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./mk_commit_files.sh <hash> [output_dir]
#
# Examples:
#   ./mk_commit_files.sh a1b2c3
#   ./mk_commit_files.sh a1b2c3 ./messages

HASH="${1:-}"
OUT_DIR="${2:-./messages}"

if [[ -z "$HASH" ]]; then
  echo "Error: missing commit hash"
  echo "Usage: $0 <hash> [output_dir]"
  exit 1
fi

mkdir -p "$OUT_DIR"

files=(
  "${OUT_DIR}/${HASH}_auto-commit.txt"
  "${OUT_DIR}/${HASH}_gemini-a.txt"
  "${OUT_DIR}/${HASH}_gemini.txt"
)

# Create files, but do not overwrite existing ones
for f in "${files[@]}"; do
  if [[ -e "$f" ]]; then
    echo "Exists (skipping): $f"
  else
    : > "$f"   # create empty file
    echo "Created: $f"
  fi
done

