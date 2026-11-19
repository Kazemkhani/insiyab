#!/usr/bin/env bash
# render-opening.sh — render the InsiyabOpening composition
# Usage: bash web/film/render-opening.sh <output-folder> [<media-folder>]
# Output: <output-folder>/opening.mp4 (H.264 silent, 31.0 s, 930 frames)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 1 ]; then
  echo 'Usage: bash web/film/render-opening.sh <output-folder> [<media-folder>]'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)
media_dir="${2:-}"

if [ -z "$media_dir" ]; then
  if [ -d "$film_out/fonts" ]; then
    media_dir="$film_out"
  elif [ -d "$HOME/work/insiyab-run/film/story/fonts" ]; then
    media_dir="$HOME/work/insiyab-run/film/story"
  fi
fi
media_dir=$(cd "$media_dir" && pwd)

echo "Opening output: $film_out"
echo "Media dir:      $media_dir"

if [ ! -d web/film/node_modules/@remotion/cli ]; then
  npm ci --prefix web/film --no-audit --no-fund
fi

echo "Rendering InsiyabOpening..."
cd web/film
node_modules/.bin/remotion render opening.jsx InsiyabOpening \
  "$film_out/opening.mp4" \
  --public-dir "$media_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 2 \
  --log error

echo "Verifying..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/opening.mp4"

echo "OPENING RENDERED: $film_out/opening.mp4"
