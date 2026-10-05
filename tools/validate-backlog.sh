#!/usr/bin/env bash
# Детерминированная проверка file-based backlog (docs/ui-system).
# Используется ночным контуром (.github/workflows/nightly.yml) и ZCode-автоматизацией
# (docs/process/nightly-review-protocol.md). Выход: отчёт в stdout + код 0 (чисто) / 1 (есть проблемы).
# Работает на docs-only репозитории; не требует Node — только find/grep/sed.
set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UI_DIR="$REPO_ROOT/docs/ui-system"
PROBLEMS=0

report() { echo "$1"; PROBLEMS=$((PROBLEMS + 1)); }

echo "== COUNTS =="
echo "task files: $(find "$UI_DIR/epics" -name 'T*.md' | wc -l)"
echo "epic dirs:  $(find "$UI_DIR/epics" -mindepth 1 -maxdepth 1 -type d | wc -l)"
echo "epic READMEs: $(find "$UI_DIR/epics" -mindepth 2 -maxdepth 2 -name 'README.md' | wc -l)"

echo "== MISSING SECTIONS =="
for f in $(find "$UI_DIR/epics" -name 'T*.md'); do
  for s in '## Epic' '## Priority' '## Type' '## Goal' '## Context' '## Scope' '## Acceptance Criteria' '## Dependencies' '## Definition of Done' '## Complexity'; do
    grep -q "$s" "$f" || report "MISSING SECTION: $f -> $s"
  done
done

echo "== LINK CHECK =="
for f in $(find "$REPO_ROOT/docs" -name '*.md'); do
  d=$(dirname "$f")
  grep -oE '\]\([^)#]+\.md\)' "$f" | sed -e 's/^\](//' -e 's/)$//' | while read -r l; do
    if [ ! -e "$d/$l" ]; then echo "BROKEN LINK: $f -> $l"; fi
  done
done | while read -r broken; do report "$broken"; done

echo "== ORPHAN CHECK =="
for f in "$UI_DIR"/epics/*/T*.md; do
  b=$(basename "$f")
  r=$(dirname "$f")/README.md
  grep -q "$b" "$r" || report "ORPHAN TASK: $f not listed in $r"
done

# Счётчик из пайпл-цикла живёт в сабшелле — повторная сверка простым подсчётом.
BROKEN=$(find "$REPO_ROOT/docs" -name '*.md' -exec sh -c '
  for f; do
    d=$(dirname "$f")
    grep -oE "\]\([^)#]+\.md\)" "$f" | sed -e "s/^\](//" -e "s/)$//" | while read -r l; do
      [ -e "$d/$l" ] || echo "$f -> $l"
    done
  done' sh {} + | wc -l)

echo "== SUMMARY =="
echo "broken links: $BROKEN"
if [ "$PROBLEMS" -eq 0 ] && [ "$BROKEN" -eq 0 ]; then
  echo "RESULT: clean"
  exit 0
fi
echo "RESULT: problems found"
exit 1
