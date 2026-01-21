#!/usr/bin/env bash
set -euo pipefail

# ========= CONFIG =========
INPUT_DIR="./messages"
OUT_DIR="./eval"
SEED=42
PREFIX="T"

# Suffix → System name (explicit & readable)
SUFFIXES=("auto-commit" "gemini-a" "gemini")
SYSTEMS=("auto_commit" "gemini_advanced" "gemini_minimal")
# ==========================

BLIND_DIR="$OUT_DIR/blind"
KEY_FILE="$OUT_DIR/key.csv"
RATINGS_FILE="$OUT_DIR/blind_ratings_template.csv"

mkdir -p "$BLIND_DIR" "$OUT_DIR"

export RANDOM=$SEED

echo "test_id,hash,label,system,source_file" > "$KEY_FILE"
echo "test_id,hash,label,what,why,format,type,overall" > "$RATINGS_FILE"

test_idx=1

# find unique commit hashes by stripping known suffixes
commit_hashes=()

for f in "$INPUT_DIR"/*_auto-commit.txt; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"
  hash="${base%%_auto-commit.txt}"
  commit_hashes+=("$hash")
done

for hash in "${commit_hashes[@]}"; do
  files=()
  systems=()
  labels=("A" "B" "C")

  # collect files in fixed logical order
  for i in "${!SUFFIXES[@]}"; do
    suffix="${SUFFIXES[i]}"
    file="$INPUT_DIR/${hash}_${suffix}.txt"

    if [[ ! -f "$file" ]]; then
      echo "Skipping $hash (missing $suffix)"
      continue 2
    fi

    files+=("$file")
    systems+=("${SYSTEMS[i]}")
  done

  test_id=$(printf "%s%02d" "$PREFIX" "$test_idx")

  # Fisher-Yates shuffle (per test case)
  for i in 2 1; do
    j=$((RANDOM % (i + 1)))
    tmp="${files[i]}"; files[i]="${files[j]}"; files[j]="$tmp"
    tmp="${systems[i]}"; systems[i]="${systems[j]}"; systems[j]="$tmp"
  done

  # write blind files + key
  for i in 0 1 2; do
    dst="$BLIND_DIR/${test_id}_${labels[i]}.txt"
    cp "${files[i]}" "$dst"

    echo "$test_id,${hash},${labels[i]},${systems[i]},$(basename "${files[i]}")" \
      >> "$KEY_FILE"

    echo "$test_id,${hash},${labels[i]},,,,," >> "$RATINGS_FILE"
  done

  test_idx=$((test_idx + 1))
done

echo "Done."
echo "Blind files:   $BLIND_DIR"
echo "Key file:      $KEY_FILE  (DO NOT OPEN BEFORE RATING)"
echo "Rating sheet:  $RATINGS_FILE"

