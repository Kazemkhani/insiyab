#!/usr/bin/env bash
# render-insert.sh — render the InsiyabInsert composition (20 s, 600 frames)
# Usage: bash web/film/render-insert.sh <output-folder>
# Output: <output-folder>/picture.mp4 (H.264 silent, 1920x1080, 30fps)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 1 ]; then
  echo 'Usage: bash web/film/render-insert.sh <output-folder>'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)
# fonts live in story's public dir
media_dir="$HOME/work/insiyab-run/film/story"

echo "Insert output: $film_out"
echo "Media dir:     $media_dir"
echo "Time:          $(date)"

echo "Installing npm deps if needed..."
if [ ! -d web/film/node_modules/@remotion/cli ]; then
  npm ci --prefix web/film --no-audit --no-fund
fi

echo "Rendering InsiyabInsert..."
cd web/film
node_modules/.bin/remotion render insert.jsx InsiyabInsert \
  "$film_out/picture.mp4" \
  --public-dir "$media_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 2 \
  --log error

echo "Time after render: $(date)"

echo "Verifying..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/picture.mp4"

echo "INSERT PICTURE BUILT"
echo "Video: $film_out/picture.mp4"
