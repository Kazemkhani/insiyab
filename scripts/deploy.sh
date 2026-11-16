#!/usr/bin/env bash
# Deploys the exact gated commit and proves that what is served equals what was built.
# The shape comes from Bayyina's scripts/deploy.sh. Only lane 1 runs this (docs/LANES.md, Deploying).
# The last line is one of:
#   DEPLOYED AND VERIFIED <commit> <address> <time>
#   DEPLOYED, VERIFIED ON THE VERCEL ADDRESS ONLY <commit> <address> <time>   (the public name does not resolve yet)
#   DRY RUN PASSED <commit>                                                   (--dry-run: everything but the upload)
#   DEPLOY STOPPED: <why>
# Usage: bash scripts/deploy.sh [--dry-run] [--shots DIR]
set -u
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"; LOCK="/tmp/insiyab-deploy.lock"; WORK=""; DRY=0; SHOTS=""
while [ $# -gt 0 ]; do case "$1" in --dry-run) DRY=1 ;; --shots) SHOTS="$2"; shift ;; *) echo "DEPLOY STOPPED: unknown option $1"; exit 1 ;; esac; shift; done
PUBLIC="$(cat scripts/public-url.txt)"; PUBLIC="${PUBLIC%/}"
VERCEL_ADDRESS="https://insiyab-nine.vercel.app"      # the project's own name at Vercel: checked when the public name does not resolve
stop() { echo "DEPLOY STOPPED: $1"; [ -n "$WORK" ] && rm -rf "$WORK"; rm -rf "$LOCK"; exit 1; }

# 1. One deploy at a time. A lock older than 20 minutes is stale.
if [ -d "$LOCK" ] && [ -n "$(find "$LOCK" -maxdepth 0 -mmin -20 2>/dev/null)" ]; then echo "DEPLOY STOPPED: another deploy holds the lock"; exit 1; fi
rm -rf "$LOCK"; mkdir "$LOCK" || exit 1

# 2. Only a clean commit that is on main, and is what the remote's main holds.
git fetch -q origin || stop "could not fetch the remote"
SHA="$(git rev-parse HEAD)"; SHORT="$(git rev-parse --short HEAD)"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || stop "not on main"
[ -z "$(git status --porcelain)" ] || stop "the tree has uncommitted changes"
[ "$(git rev-parse origin/main)" = "$SHA" ] || stop "HEAD is not what is on the remote's main: pull or push first"

# 3. The gates, on this commit.
BROWSER=1 bash scripts/gates.sh > "$LOCK/gates.txt" 2>&1; tail -1 "$LOCK/gates.txt" | grep -q "^ALL GATES PASS$" || { tail -20 "$LOCK/gates.txt"; stop "the gates do not pass on $SHORT"; }
echo "PASS gates on $SHORT"

# 4. Which bundle. Stand-in data unless the real bundle exists AND a mentor's yes is recorded (docs/LANES.md, Deploying).
BUNDLE="fixtures"; FIXTURE="true"
REAL=0; [ -f artifacts/meta.json ] && python3 -c "import json,sys; sys.exit(0 if json.load(open('artifacts/meta.json')).get('fixture') is False else 1)" && REAL=1
YES=0; grep -q "^TOTALS MAY LEAVE DATAIKU: YES$" docs/REQUIREMENTS.md && YES=1
if [ "$REAL" = "1" ] && [ "$YES" = "1" ]; then BUNDLE="artifacts"; FIXTURE="false"; fi
echo "bundle: $BUNDLE (real bundle exists: $REAL; a mentor's yes is recorded: $YES)"

# 5. A fresh copy of that commit, built into a fresh empty folder. Nothing from the working folder can leak in.
[ -f web/build.mjs ] || stop "web/build.mjs does not exist on $SHORT: lane 2 has not delivered a site"
WORK="$(mktemp -d)"; mkdir "$WORK/src"; git archive "$SHA" | tar -x -C "$WORK/src" || stop "could not make a clean copy"
UP="$WORK/upload"
( cd "$WORK/src" && node web/build.mjs --bundle "$BUNDLE" --out "$UP" ) > "$LOCK/build.txt" 2>&1 || { tail -15 "$LOCK/build.txt"; stop "lane 2's build failed"; }
[ -s "$UP/index.html" ] || stop "the build has no index.html"
KHUTWA=0
if [ -f "$WORK/src/rider/build.mjs" ]; then
  ( cd "$WORK/src" && node rider/build.mjs --bundle "$BUNDLE" --out "$UP/khutwa" ) > "$LOCK/rider.txt" 2>&1 || { tail -15 "$LOCK/rider.txt"; stop "lane 3's build failed"; }
  [ -s "$UP/khutwa/index.html" ] || stop "the Khutwa build has no index.html"; KHUTWA=1
elif [ -f "$WORK/src/live/khutwa/build.mjs" ]; then      # lane 1's stand-in for the passenger page, until lane 3's rider/ exists
  ( cd "$WORK/src" && node live/khutwa/build.mjs --bundle "$BUNDLE" --out "$UP/khutwa" ) > "$LOCK/rider.txt" 2>&1 || { tail -15 "$LOCK/rider.txt"; stop "the Khutwa page's build failed"; }
  [ -s "$UP/khutwa/index.html" ] || stop "the Khutwa build has no index.html"; KHUTWA=1; echo "NOTE rider/build.mjs does not exist yet: the Khutwa page is lane 1's, from live/khutwa/"
else echo "NOTE this deploy has no Khutwa page"; fi
# The room relay (live/api): six small calls under /api/room/. It is the only thing in the upload that is not a plain file.
RELAY=0
if [ -d "$WORK/src/live/api" ]; then
  [ -e "$UP/api" ] && stop "a build wrote something under api/: that address belongs to the room relay"
  cp -R "$WORK/src/live/api" "$UP/api"; RELAY=1
fi
# The deployer's own files: the page asks not to be indexed whatever the builds contain, and says which commit it is.
[ -f "$UP/vercel.json" ] || cat > "$UP/vercel.json" <<'JSON'
{"headers": [{"source": "/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive"}, {"key": "X-Content-Type-Options", "value": "nosniff"}]}]}
JSON
[ -f "$UP/robots.txt" ] || printf 'User-agent: *\nDisallow: /\n' > "$UP/robots.txt"
printf '{"commit": "%s", "bundle": "%s", "fixture": %s}\n' "$SHORT" "$BUNDLE" "$FIXTURE" > "$UP/deploy.json"

# 6. The secret scan tests itself with a planted fake first, then scans the upload.
PATTERNS='AIza[0-9A-Za-z_-]{30,}|ya29\.[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[0-9A-Za-z-]{10,}|"private_key"|(AC|SK)[0-9a-f]{32}'
mkdir "$WORK/selftest"; printf 'key = "AIza%s"\n' "SyFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE00" > "$WORK/selftest/planted.js"
grep -rEq "$PATTERNS" "$WORK/selftest" || stop "the secret scan did not find its own planted fake"
if grep -rElI "$PATTERNS" "$UP"; then stop "the upload matches a secret pattern in the files named above"; fi
echo "PASS secret scan (self-tested with a planted fake)"

# 7. Each private value on this machine, searched for by its real value and never printed.
for envfile in "$HOME/.config/marsad/twilio.env" "$HOME/.config/insiyab/presenter.env"; do
  [ -f "$envfile" ] || continue
  while IFS='=' read -r _ v; do v="${v%\"}"; v="${v#\"}"; [ "${#v}" -gt 5 ] && grep -rqF -- "$v" "$UP" && stop "the upload contains a private value from this machine"; done < "$envfile"
done
echo "PASS no private value from this machine is in the upload"

# 8. The guard, on the upload: no raw table, no identifier column, no feed file. It is given a planted leak first.
python3 - "$UP" > "$LOCK/guard.txt" 2>&1 <<'PY' || { cat "$LOCK/guard.txt"; stop "the guard refused the upload"; }
import os, sys
sys.path.insert(0, "tools"); import guard
up = sys.argv[1]
planted = guard.check(["site/data/leak.json"], lambda p: '[{"NOL_ID": "x"}]')
assert planted, "the guard did not catch a planted leak"
rel = [os.path.relpath(os.path.join(d, f), up) for d, _, fs in os.walk(up) for f in fs]
bad = guard.check(["site/" + r for r in rel], lambda p: open(os.path.join(up, p[5:]), encoding="utf-8", errors="ignore").read())
for p, why in bad: print("FAIL", p[5:], why)
sys.exit(1 if bad else 0)
PY
# Nothing but static files, and one bundle only: stand-in and real are never mixed.
[ -z "$(find "$UP" \( -name '.env*' -o -name '*.db' -o -name '*.py' -o -name '*.sh' -o -name '.git*' -o -name 'node_modules' \) -print -quit)" ] || stop "the upload holds a file that must not be public"
[ -z "$(find "$UP" -path '*/api/*' ! -path "$UP/api/*" -print -quit)" ] || stop "the upload holds an api folder that is not the room relay's"
if [ "$RELAY" = "1" ]; then diff -rq "$WORK/src/live/api" "$UP/api" >/dev/null || stop "the relay in the upload is not the relay in the commit"; fi
python3 - "$UP" "$FIXTURE" > "$LOCK/mix.txt" 2>&1 <<'PY' || { cat "$LOCK/mix.txt"; stop "the upload mixes stand-in and real data, or a data file does not say which it is"; }
import json, os, sys
up, want = sys.argv[1], sys.argv[2] == "true"; n = 0; bad = 0
for d, _, fs in os.walk(os.path.join(up, "data")):
    for f in fs:
        if not f.endswith(".json"): continue
        try: got = json.load(open(os.path.join(d, f))).get("fixture")
        except Exception as e: print("FAIL", f, "is not readable JSON:", e); bad += 1; continue
        n += 1
        if got is not want: print("FAIL", os.path.relpath(os.path.join(d, f), up), "says fixture =", got, "but this deploy is fixture =", want); bad += 1
if n == 0: print("FAIL the upload has no bundle under data/"); bad += 1
print(n, "bundle files")
sys.exit(1 if bad else 0)
PY
echo "PASS upload folder: $(find "$UP" -type f | wc -l | tr -d ' ') static files, $(head -1 "$LOCK/mix.txt" | tr -d '\n') all saying fixture = $FIXTURE, the guard finds no raw data"

# 9. A real browser on the built folder, before anything is uploaded.
BROWSER_ARGS=(); [ "$FIXTURE" = "true" ] && BROWSER_ARGS+=(--fixture); [ "$KHUTWA" = "1" ] && BROWSER_ARGS+=(--khutwa); [ -n "$SHOTS" ] && BROWSER_ARGS+=(--shots "$SHOTS/built")
python3 tests/browser_check.py "$UP" ${BROWSER_ARGS[@]+"${BROWSER_ARGS[@]}"} > "$LOCK/smoke-built.txt" 2>&1; tail -1 "$LOCK/smoke-built.txt" | grep -q "^ERRORS: 0$" || { grep -E "^FAIL|Error" "$LOCK/smoke-built.txt" | head; stop "the browser check failed on the built folder"; }
echo "PASS browser on the built folder ($(grep -c '^PASS ' "$LOCK/smoke-built.txt") checks)"

if [ "$DRY" = "1" ]; then rm -rf "$WORK" "$LOCK"; echo "DRY RUN PASSED $SHORT"; exit 0; fi

# 10. Deploy to production, and try once more after a short wait.
mkdir -p "$UP/.vercel"; [ -f "$ROOT/.vercel/project.json" ] && cp "$ROOT/.vercel/project.json" "$UP/.vercel/" || stop "no Vercel project is linked (.vercel/project.json)"
DEPLOYED=""
for try in 1 2; do
  ( cd "$UP" && vercel deploy --prod --yes ) > "$LOCK/vercel.txt" 2>&1
  DEPLOYED="$(grep -oE 'https://[a-z0-9-]+\.vercel\.app' "$LOCK/vercel.txt" | head -1)"
  [ -n "$DEPLOYED" ] && break; sleep 15
done
[ -n "$DEPLOYED" ] || { tail -5 "$LOCK/vercel.txt"; stop "the deploy did not return an address"; }

# 11. Which address can be checked. If the public name does not resolve, say so in the last line: it is a different fact.
CHECK="$PUBLIC"; ON_PUBLIC=1
curl -s -o /dev/null --max-time 20 "$PUBLIC/deploy.json" || { CHECK="$VERCEL_ADDRESS"; ON_PUBLIC=0; echo "NOTE $PUBLIC does not answer (no DNS record yet): checking $VERCEL_ADDRESS instead"; }
echo "deployed $SHORT to $DEPLOYED; checking $CHECK"

# 12. Served equals built, by hash, for every file. The old version can be served briefly, so wait up to 90 seconds.
same() { ( cd "$UP" && find . -type f ! -path './.vercel/*' ! -path './api/*' ! -name vercel.json | sed 's|^\./||' ) | while read -r f; do
    want="$(shasum -a 256 "$UP/$f" | cut -d' ' -f1)"; got="$(curl -sL --max-time 30 "$CHECK/$f" | shasum -a 256 | cut -d' ' -f1)"
    [ "$want" = "$got" ] || { echo "$f"; return 1; }; done; }
OKAY=0; BAD=""; for wait in 0 10 20 30 30; do sleep "$wait"; BAD="$(same)"; [ -z "$BAD" ] && { OKAY=1; break; }; done
[ "$OKAY" = "1" ] || stop "served differs from built: $BAD"
echo "PASS served equals built: every one of $(find "$UP" -type f ! -path '*/.vercel/*' ! -path "$UP/api/*" ! -name vercel.json | wc -l | tr -d ' ') files, by hash"

# 13. Things that must not be reachable, and the page must ask not to be indexed.
for f in .env .git/config .vercel/project.json scripts/deploy.sh tools/guard.py model/run.py docs/STRATEGY.md fixtures/raw/nol_transactions.csv data/CENSUS-LOCAL.md; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$CHECK/$f")"; [ "$code" = "404" ] || [ "$code" = "403" ] || stop "$f answers $code on $CHECK"; done
curl -sI --max-time 20 "$CHECK/index.html" | grep -qi '^x-robots-tag:.*noindex' || stop "$CHECK does not send noindex"
echo "PASS closed paths answer 404 and the site asks not to be indexed"

# The room relay answers, says which store holds the room, and refuses a visitor the presenter's calls.
if [ "$RELAY" = "1" ]; then
  STATE="$(curl -s --max-time 20 "$CHECK/api/room/state")"
  printf '%s' "$STATE" | python3 -c "import json,sys; s=json.load(sys.stdin); assert s['phase'] in ('waiting','offer','closed') and isinstance(s['joined'], int) and s['store'] in ('memory','shared'); print('the room is held in a', s['store'], 'store')" > "$LOCK/room.txt" 2>&1 || stop "the room relay does not answer on $CHECK: $(printf '%s' "$STATE" | head -c 200)"
  for call in phase reset call; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST -H 'content-type: application/json' -d '{"phase":"offer"}' "$CHECK/api/room/$call")"; [ "$code" = "401" ] || stop "a visitor's POST to /api/room/$call answered $code, not 401"
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST -H 'content-type: application/json' -H 'x-presenter-code: not-the-code' -d '{"phase":"offer"}' "$CHECK/api/room/$call")"; [ "$code" = "401" ] || stop "a wrong presenter code on /api/room/$call answered $code, not 401"
  done
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$CHECK/api/_room.js")"; [ "$code" = "404" ] || stop "the relay's source answers $code on $CHECK"
  echo "PASS the room relay answers ($(cat "$LOCK/room.txt")), and refuses a visitor all three presenter calls"
fi

# 14. A real browser on the served address, at laptop and phone size.
BROWSER_ARGS=(); [ "$FIXTURE" = "true" ] && BROWSER_ARGS+=(--fixture); [ "$KHUTWA" = "1" ] && BROWSER_ARGS+=(--khutwa); [ -n "$SHOTS" ] && BROWSER_ARGS+=(--shots "$SHOTS/served")
python3 tests/browser_check.py "$CHECK/" ${BROWSER_ARGS[@]+"${BROWSER_ARGS[@]}"} > "$LOCK/smoke.txt" 2>&1; tail -1 "$LOCK/smoke.txt" | grep -q "^ERRORS: 0$" || { grep -E "^FAIL|Error" "$LOCK/smoke.txt" | head; stop "the browser check failed on $CHECK"; }
echo "PASS browser on $CHECK ($(grep -c '^PASS ' "$LOCK/smoke.txt") checks)"

rm -rf "$WORK" "$LOCK"
if [ "$ON_PUBLIC" = "1" ]; then echo "DEPLOYED AND VERIFIED $SHORT $PUBLIC $(date '+%Y-%m-%d %H:%M %Z')"
else echo "DEPLOYED, VERIFIED ON THE VERCEL ADDRESS ONLY $SHORT $CHECK $(date '+%Y-%m-%d %H:%M %Z')"; fi
