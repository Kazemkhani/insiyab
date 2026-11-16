#!/usr/bin/env bash
# Makes .venv with the engine's libraries (model/requirements.txt). Run once after cloning: bash scripts/setup.sh
# The gates run the engine's tests with .venv/bin/python when it exists, and with python3 otherwise.
set -eu
cd "$(dirname "$0")/.."
if command -v uv >/dev/null 2>&1; then uv venv -q --allow-existing --python 3.12 .venv && uv pip install -q --python .venv/bin/python -r model/requirements.txt
else python3 -m venv .venv && .venv/bin/python -m pip install -q -r model/requirements.txt; fi
.venv/bin/python -m pip --version >/dev/null 2>&1 || true
.venv/bin/python -c "import pandas, numpy, sklearn; print('pandas', pandas.__version__, 'numpy', numpy.__version__, 'scikit-learn', sklearn.__version__)"
( command -v uv >/dev/null 2>&1 && uv pip install -q --python .venv/bin/python lightgbm || .venv/bin/python -m pip install -q lightgbm ) >/dev/null 2>&1 || true
.venv/bin/python -c "import lightgbm; print('lightgbm', lightgbm.__version__)" 2>/dev/null || echo "lightgbm is not usable here: the engine will use scikit-learn's boosted trees"
echo "SET UP"
