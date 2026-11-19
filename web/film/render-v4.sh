#!/usr/bin/env bash
# render-v4.sh — render Insiyab Film v4
# Usage: bash web/film/render-v4.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

PUBLIC_DIR="$HOME/work/insiyab-run/film/v4/public"
OUT_DIR="$HOME/work/insiyab-run/film/v4"

echo "=== Insiyab Film v4 render ==="
echo "Time: $(date)"
echo "Public dir: $PUBLIC_DIR"
echo "Output: $OUT_DIR"

cd web/film

echo ""
echo "--- Rendering InsiyabV4 (full 80s) ---"
node_modules/.bin/remotion render v4/root.jsx InsiyabV4 \
  "$OUT_DIR/Insiyab-film-v4.mp4" \
  --public-dir "$PUBLIC_DIR" \
  --codec h264 \
  --crf 18 \
  --video-bitrate-kbps 8000 \
  --audio-codec aac \
  --audio-bitrate "192k" \
  --concurrency 4 \
  --log info \
  --timeout 60000

echo ""
echo "--- Applying loudnorm pass to full film ---"
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4.mp4" \
  -af loudnorm=I=-16:TP=-1:LRA=11:print_format=summary \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4-norm.mp4" \
  2>&1 | tail -20

mv "$OUT_DIR/Insiyab-film-v4-norm.mp4" "$OUT_DIR/Insiyab-film-v4.mp4"

echo ""
echo "--- Rendering InsiyabV4Opening (0-40s stage cut) ---"
node_modules/.bin/remotion render v4/root.jsx InsiyabV4Opening \
  "$OUT_DIR/Insiyab-film-v4-opening.mp4" \
  --public-dir "$PUBLIC_DIR" \
  --codec h264 \
  --crf 18 \
  --audio-codec aac \
  --audio-bitrate "192k" \
  --concurrency 4 \
  --log error

echo ""
echo "--- Verifying outputs ---"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate \
  -of json "$OUT_DIR/Insiyab-film-v4.mp4"

echo ""
echo "=== RENDER COMPLETE ==="
echo "Full film: $OUT_DIR/Insiyab-film-v4.mp4"
echo "Stage cut: $OUT_DIR/Insiyab-film-v4-opening.mp4"
echo "Time: $(date)"
