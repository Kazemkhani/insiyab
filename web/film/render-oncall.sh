#!/usr/bin/env bash
# render-oncall.sh — render the InsiyabOncall on-the-day calling composition
# Usage: bash web/film/render-oncall.sh <output-folder>
# Output: <output-folder>/picture.mp4 (H.264 silent, 1920x1080, 30fps, 28.3s)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 1 ]; then
  echo 'Usage: bash web/film/render-oncall.sh <output-folder>'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)

# Fonts: look in story output dir (same as render-story.sh)
if [ -d "$film_out/fonts" ]; then
  media_dir="$film_out"
elif [ -d "$HOME/work/insiyab-run/film/story/fonts" ]; then
  media_dir="$HOME/work/insiyab-run/film/story"
elif [ -d "$HOME/work/insiyab-run/film/comic/media/fonts" ]; then
  mkdir -p "$film_out/fonts"
  cp "$HOME/work/insiyab-run/film/comic/media/fonts/"*.woff2 "$film_out/fonts/"
  media_dir="$film_out"
else
  echo 'ERROR: no fonts dir found. Need story fonts.'
  exit 2
fi

media_dir=$(cd "$media_dir" && pwd)
echo "Film output: $film_out"
echo "Media dir:   $media_dir"
echo "Time:        $(date)"

echo "Installing npm deps if needed..."
if [ ! -d web/film/node_modules/@remotion/cli ]; then
  npm ci --prefix web/film --no-audit --no-fund
fi

echo "Rendering InsiyabOncall..."
cd web/film
node_modules/.bin/remotion render oncall.jsx InsiyabOncall \
  "$film_out/picture.mp4" \
  --public-dir "$media_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 2 \
  --log error

echo "Time after render: $(date)"

echo "Verifying output..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/picture.mp4"

echo "ONCALL FILM PICTURE BUILT"
echo "Video: $film_out/picture.mp4"
