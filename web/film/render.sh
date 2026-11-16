#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ "$#" -ne 2 ]; then echo 'Usage: bash web/film/render.sh <built-site> <output-folder>'; exit 2; fi
site_dir=$(cd "$1" && pwd)
mkdir -p "$2"
film_out=$(cd "$2" && pwd)
if [ ! -d web/film/node_modules/@remotion/cli ]; then npm ci --prefix web/film --no-audit --no-fund; fi
python3 web/film/capture.py --site "$site_dir" --out "$film_out/media"
cd web/film
node_modules/.bin/remotion render index.jsx InsiyabOpening "$film_out/Insiyab-opening.mp4" --public-dir "$film_out/media" --codec h264 --crf 18 --concurrency 2
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of json "$film_out/Insiyab-opening.mp4"
echo 'FILM BUILT'
