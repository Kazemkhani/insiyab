#!/usr/bin/env bash
# render-walkthrough.sh — render the InsiyabWalkthrough screenshot-tour composition
# Usage: bash web/film/render-walkthrough.sh <output-folder> <shots-folder>
# Output: <output-folder>/picture.mp4 (H.264 silent, 1920x1080, 30fps, 60s)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 2 ]; then
  echo 'Usage: bash web/film/render-walkthrough.sh <output-folder> <shots-folder>'
  echo '  output-folder: where picture.mp4 lands'
  echo '  shots-folder:  directory containing s01.png ... s10.png'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)
shots_dir=$(cd "$2" && pwd)

echo "Film output : $film_out"
echo "Shots dir   : $shots_dir"
echo "Time        : $(date)"

echo "Installing npm deps if needed..."
if [ ! -d web/film/node_modules/@remotion/cli ]; then
  npm ci --prefix web/film --no-audit --no-fund
fi

echo "Rendering InsiyabWalkthrough..."
cd web/film
node_modules/.bin/remotion render walkthrough.jsx InsiyabWalkthrough \
  "$film_out/picture.mp4" \
  --public-dir "$shots_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 2 \
  --log error

echo "Time after render: $(date)"

echo "Verifying output..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/picture.mp4"

echo "WALKTHROUGH FILM BUILT"
echo "Video: $film_out/picture.mp4"
