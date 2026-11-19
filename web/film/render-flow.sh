#!/usr/bin/env bash
# render-flow.sh — render the InsiyabFlow Dataiku flow walkthrough
# Usage: bash web/film/render-flow.sh <output-folder> <shots-folder>
# Output: <output-folder>/picture.mp4 (H.264 silent, 1920x1080, 60s)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 2 ]; then
  echo 'Usage: bash web/film/render-flow.sh <output-folder> <shots-folder>'
  echo '  output-folder: where picture.mp4 and Insiyab-flow.mp4 land'
  echo '  shots-folder:  directory containing flow-whole.jpg'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)
shots_dir=$(cd "$2" && pwd)

echo "Film output: $film_out"
echo "Shots dir:   $shots_dir"
echo "Time:        $(date)"

# Need fonts too — reuse from story if available
media_dir="$shots_dir"
if [ ! -d "$shots_dir/fonts" ]; then
  if [ -d "$HOME/work/insiyab-run/film/story/fonts" ]; then
    echo "Symlinking fonts from story..."
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

echo "Rendering InsiyabFlow..."
cd web/film
node_modules/.bin/remotion render flow.jsx InsiyabFlow \
  "$film_out/picture.mp4" \
  --public-dir "$shots_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 4 \
  --log error

echo "Time after render: $(date)"

echo "Verifying picture..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/picture.mp4"

echo "FLOW FILM PICTURE BUILT: $film_out/picture.mp4"
