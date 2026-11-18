#!/usr/bin/env bash
# render-story.sh — render the InsiyabStory motion-graphics composition
# Usage: bash web/film/render-story.sh <output-folder> [<media-folder>]
# Output: <output-folder>/picture.mp4 (H.264 silent)
# Poster:  <output-folder>/film-poster.png (the strongest frame, ~frame 900 = 30s)
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 1 ]; then
  echo 'Usage: bash web/film/render-story.sh <output-folder> [<media-folder>]'
  exit 2
fi

film_out=$(mkdir -p "$1" && cd "$1" && pwd)
media_dir="${2:-}"

# If no media dir given, try the existing comic media which has the fonts
if [ -z "$media_dir" ]; then
  if [ -d "$film_out/fonts" ]; then
    media_dir="$film_out"
  elif [ -d "$HOME/work/insiyab-run/film/story/fonts" ]; then
    media_dir="$HOME/work/insiyab-run/film/story"
  elif [ -d "$HOME/work/insiyab-run/film/comic/media" ]; then
    # Copy fonts and QR to story dir
    mkdir -p "$film_out/fonts"
    cp "$HOME/work/insiyab-run/film/comic/media/fonts/"*.woff2 "$film_out/fonts/"
    cp "$HOME/work/insiyab-run/film/comic/media/qr.svg" "$film_out/qr.svg" 2>/dev/null || true
    media_dir="$film_out"
  else
    echo 'ERROR: no media dir found (need fonts/). Pass it as the second argument.'
    exit 2
  fi
fi

media_dir=$(cd "$media_dir" && pwd)

echo "Film output: $film_out"
echo "Media dir:   $media_dir"
echo "Installing npm deps if needed..."
if [ ! -d web/film/node_modules/@remotion/cli ]; then
  npm ci --prefix web/film --no-audit --no-fund
fi

echo "Rendering InsiyabStory..."
cd web/film
node_modules/.bin/remotion render story.jsx InsiyabStory \
  "$film_out/picture.mp4" \
  --public-dir "$media_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 2 \
  --log error

echo "Extracting poster frame (frame 900 = 30s)..."
ffmpeg -y \
  -i "$film_out/picture.mp4" \
  -vf "select=eq(n\,900)" -vframes 1 \
  "$film_out/film-poster.png"

echo "Verifying output..."
ffprobe -v error \
  -show_entries format=duration:stream=codec_name,width,height \
  -of json "$film_out/picture.mp4"

echo "STORY FILM BUILT"
echo "Video: $film_out/picture.mp4"
echo "Poster: $film_out/film-poster.png"
