#!/usr/bin/env bash
# Installs the pre-commit guard for this clone. Run once after cloning: bash scripts/install-hooks.sh
cd "$(dirname "$0")/.." || exit 1
printf '#!/usr/bin/env bash\nexec python3 tools/guard.py\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && echo "pre-commit guard installed"
