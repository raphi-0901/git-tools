#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./mk_branch_files.sh <hash> [output_dir]
#
# Examples:
#   ./mk_branch_files.sh identifier
#   ./mk_branch_files.sh identifier ./branches

IDENTIFIER="${1:-}"
OUT_DIR="${2:-./branches}"

if [[ -z "$IDENTIFIER" ]]; then
  echo "Error: missing identifier"
  echo "Usage: $0 <identifier> [output_dir]"
  exit 1
fi

mkdir -p "$OUT_DIR"

files=(
  "${OUT_DIR}/${IDENTIFIER}_original.txt"
  "${OUT_DIR}/${IDENTIFIER}_auto-branch.txt"
  "${OUT_DIR}/${IDENTIFIER}_gemini-a.txt"
  "${OUT_DIR}/${IDENTIFIER}_gemini.txt"
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

