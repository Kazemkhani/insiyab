#!/usr/bin/env bash
# Builds the four hand-off zips from the current documents, into handoff/ and, if it exists, ~/Desktop.
# Usage: bash tools/make_handoff.sh
set -euo pipefail
cd "$(dirname "$0")/.."
COMMON="docs/REQUIREMENTS.md docs/STRATEGY.md docs/RULES.md docs/LANES.md docs/CONTRACT.md docs/DATA.md AGENTS.md"
build() {   # build <lane folder> <zip name> <extra files...>
  local lane="$1" name="$2"; shift 2
  local stage; stage="$(mktemp -d)"; mkdir -p "$stage/$name/docs/research"
  cp "handoff/$lane/00-START-HERE.md" "handoff/$lane/PROMPT.md" "$stage/$name/"
  for f in $COMMON "$@"; do [ -f "$f" ] || { echo "missing $f"; exit 1; }; case "$f" in docs/research/*) cp "$f" "$stage/$name/docs/research/";; docs/*) cp "$f" "$stage/$name/docs/";; *) cp "$f" "$stage/$name/";; esac; done
  rmdir "$stage/$name/docs/research" 2>/dev/null || true
  rm -f "handoff/$name.zip"; ( cd "$stage" && zip -q -r -X "$OLDPWD/handoff/$name.zip" "$name" ); rm -rf "$stage"
  [ -d "$HOME/Desktop" ] && cp "handoff/$name.zip" "$HOME/Desktop/$name.zip"
  echo "$name.zip: $(unzip -l "handoff/$name.zip" | tail -1 | awk '{print $2}') files, $(du -h "handoff/$name.zip" | cut -f1)"
}
METHODS=""; [ -f docs/research/research-methods.md ] && METHODS="docs/research/research-methods.md"
build 1-claude-engine  Insiyab-1-Claude-Engine   docs/MODEL-PLAN.md docs/TWIN.md docs/CRITERIA-MATRIX.md docs/research/research-dubai.md $METHODS
build 2-codex-twin     Insiyab-2-Codex-Twin      docs/TWIN.md docs/MODEL-PLAN.md
build 3-devin-opendata Insiyab-3-Devin-OpenData  docs/research/research-dubai.md
build 4-mustafo-pitch  Insiyab-4-Mustafo-Pitch   docs/CRITERIA-MATRIX.md docs/research/research-dubai.md
