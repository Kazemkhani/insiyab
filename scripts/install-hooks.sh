#!/usr/bin/env bash
# Installs this clone's two hooks. Run once after cloning: bash scripts/install-hooks.sh
#   pre-commit  refuses raw data and identifiers (tools/guard.py)
#   commit-msg  refuses a co-author line or any "generated with" trailer: commits carry the author and nothing else
cd "$(dirname "$0")/.." || exit 1
printf '#!/usr/bin/env bash\nexec python3 tools/guard.py\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
cat > .git/hooks/commit-msg <<'HOOK'
#!/usr/bin/env bash
if grep -qiE '^(co-authored-by:|signed-off-by:|claude-session:)|generated with|🤖' "$1"; then
  echo "commit refused: remove the co-author line or trailer (docs/RULES.md, section 7)"; exit 1
fi
HOOK
chmod +x .git/hooks/commit-msg && echo "hooks installed: pre-commit guard, commit-msg trailer check"
