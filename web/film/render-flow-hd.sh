#!/usr/bin/env bash
# render-flow-hd.sh — render InsiyabFlow from flow-hd.jsx (per-zone HD images)
# Usage: bash web/film/render-flow-hd.sh <output-folder> <shots-folder>
# Output: <output-folder>/picture.mp4 (H.264 silent, 1920x1080, 60s, crf 16)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 2 ]; then
  echo 'Usage: bash web/film/render-flow-hd.sh <output-folder> <shots-folder>'
  echo '  output-folder: where picture.mp4 and Insiyab-flow-hd.mp4 land'
  echo '  shots-folder:  directory containing whole.png, z1-default.png … z5-forecast.png'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)
shots_dir=$(cd "$2" && pwd)

echo "Film output: $film_out"
echo "Shots dir:   $shots_dir"
echo "Time:        $(date)"

# Fonts: copy from story if not already present
if [ ! -d "$shots_dir/fonts" ]; then
  if [ -d "$HOME/work/insiyab-run/film/story/fonts" ]; then
    echo "Copying fonts from story..."
    mkdir -p "$shots_dir/fonts"
    cp "$HOME/work/insiyab-run/film/story/fonts/"*.woff2 "$shots_dir/fonts/"
  else
    echo "ERROR: no fonts directory found. Copy woff2 fonts to $shots_dir/fonts/"
    exit 2
  fi
fi

echo "Installing npm deps if needed..."
if [ ! -d web/film/node_modules/@remotion/cli ]; then
  npm ci --prefix web/film --no-audit --no-fund
fi

echo "Rendering InsiyabFlow (flow-hd.jsx, crf 16)..."
cd web/film
node_modules/.bin/remotion render flow-hd.jsx InsiyabFlow \
  "$film_out/picture.mp4" \
  --public-dir "$shots_dir" \
  --codec h264 \
  --crf 16 \
  --concurrency 4 \
  --log error

echo "Time after render: $(date)"

echo "Verifying picture..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/picture.mp4"

echo "FLOW HD FILM PICTURE BUILT: $film_out/picture.mp4"
