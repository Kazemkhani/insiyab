#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../../.."
cmp -s live/api/drill/incident.json live/voice/incident-example.json && echo 'PASS the drill scenario equals the relay scenario' || { echo 'FAIL live/api/drill/incident.json differs from live/voice/incident-example.json'; exit 1; }
node live/api/drill/tests/drill.test.js
# last line from drill.test.js is ALL PASS
