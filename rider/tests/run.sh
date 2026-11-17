#!/usr/bin/env bash
# The Khutwa page's tests. First the rules and the build, with Node alone. Then the page itself in a real browser at
# phone size, where Playwright and its browser are installed; where they are not, that part is skipped and said so.
# The last line is ALL PASS.
#   bash rider/tests/run.sh [--shots DIR]
set -u
cd "$(dirname "$0")/../.." || exit 1
node rider/tests/logic.test.mjs || { echo "FAILED: the rules or the build"; exit 1; }
if python3 -c "import playwright" 2>/dev/null; then
  python3 rider/tests/page_check.py "$@" || { echo "FAILED: the page in a browser"; exit 1; }
else
  echo "NOTE no browser here (Playwright is not installed): the page was not opened; the rules and the build were checked"
fi
echo "ALL PASS"
