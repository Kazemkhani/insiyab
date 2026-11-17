#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ "$#" -ne 3 ]; then echo 'Usage: bash web/film/render-comic.sh <built-site> <output-folder> <supplied-audio-folder>'; exit 2; fi
site_dir=$(cd "$1" && pwd)
mkdir -p "$2"
film_out=$(cd "$2" && pwd)
audio_dir=$(cd "$3" && pwd)
if [ ! -d web/film/node_modules/@remotion/cli ]; then npm ci --prefix web/film --no-audit --no-fund; fi
node web/film/prepare-comic.mjs "$site_dir" "$film_out/media" "$audio_dir"
python3 web/film/capture-comic.py "$site_dir" "$film_out/media"
cd web/film
node_modules/.bin/remotion render comic.jsx InsiyabComic "$film_out/Insiyab-comic.mp4" --public-dir "$film_out/media" --codec h264 --crf 18 --concurrency 2
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of json "$film_out/Insiyab-comic.mp4"
echo 'COMIC FILM BUILT'
