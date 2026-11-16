#!/usr/bin/env bash
# Builds the four hand-off zips from the current documents, into handoff/ and, if it exists, ~/Desktop.
#   bash tools/make_handoff.sh           build
#   bash tools/make_handoff.sh --check   fail if a zip's prompt or start-here differs from the repository's (a stale zip misleads a worker)
set -euo pipefail
cd "$(dirname "$0")/.."
LANES="1-claude-engine:Insiyab-1-Claude-Engine 2-codex-twin:Insiyab-2-Codex-Twin 3-devin-opendata:Insiyab-3-Devin-OpenData 4-mustafo-pitch:Insiyab-4-Mustafo-Pitch"
if [ "${1:-}" = "--check" ]; then
  bad=0
  for pair in $LANES; do lane="${pair%%:*}"; name="${pair##*:}"
    for f in PROMPT.md 00-START-HERE.md; do
      if unzip -p "handoff/$name.zip" "$name/$f" 2>/dev/null | cmp -s - "handoff/$lane/$f"; then echo "PASS $name.zip carries the current $f"; else echo "FAIL $name.zip has an old $f (run: bash tools/make_handoff.sh)"; bad=1; fi
    done
  done
  [ "$bad" = "0" ] && echo "ALL PASS" || echo "1 FAILED"; exit "$bad"
fi
COMMON="docs/REQUIREMENTS.md docs/STRATEGY.md docs/WOW.md docs/RULES.md docs/LANES.md docs/CONTRACT.md docs/DATA.md docs/TOOLS.md AGENTS.md"
build() {   # build <lane folder> <zip name> <extra files...>
  local lane="$1" name="$2"; shift 2
  local stage; stage="$(mktemp -d)"; mkdir -p "$stage/$name/docs/research"
  cp "handoff/$lane/00-START-HERE.md" "handoff/$lane/PROMPT.md" "$stage/$name/"
  for f in $COMMON "$@"; do [ -f "$f" ] || { echo "missing $f"; exit 1; }; case "$f" in docs/research/*) cp "$f" "$stage/$name/docs/research/";; docs/*) cp "$f" "$stage/$name/docs/";; *) cp "$f" "$stage/$name/";; esac; done
  rmdir "$stage/$name/docs/research" 2>/dev/null || true
  rm -f "handoff/$name.zip"; ( cd "$stage" && zip -q -r -X "$OLDPWD/handoff/$name.zip" "$name" ); rm -rf "$stage"
  [ -d "$HOME/Desktop" ] && cp "handoff/$name.zip" "$HOME/Desktop/$name.zip"
  echo "$name.zip: $(du -h "handoff/$name.zip" | cut -f1)"
}
build 1-claude-engine  Insiyab-1-Claude-Engine   docs/MODEL-PLAN.md docs/TWIN.md docs/CRITERIA-MATRIX.md docs/research/research-dubai.md docs/research/research-methods.md
build 2-codex-twin     Insiyab-2-Codex-Twin      docs/TWIN.md docs/MODEL-PLAN.md
build 3-devin-opendata Insiyab-3-Devin-OpenData  docs/research/research-dubai.md
build 4-mustafo-pitch  Insiyab-4-Mustafo-Pitch   docs/CRITERIA-MATRIX.md docs/MODEL-PLAN.md docs/TWIN.md docs/research/research-dubai.md
