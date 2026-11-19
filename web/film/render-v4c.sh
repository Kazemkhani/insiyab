#!/usr/bin/env bash
# render-v4c.sh — render Insiyab Film v4c (84s full + 40s opening)
# Usage: bash web/film/render-v4c.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

PUBLIC_DIR="$HOME/work/insiyab-run/film/v4c/public"
OUT_DIR="$HOME/work/insiyab-run/film/v4c/out"
mkdir -p "$OUT_DIR"

echo "=== Insiyab Film v4c render ==="
echo "Time: $(date)"
echo "Public dir: $PUBLIC_DIR"
echo "Output: $OUT_DIR"

cd web/film

echo ""
echo "--- Rendering InsiyabV4c (full 84s) ---"
node_modules/.bin/remotion render v4c/root.jsx InsiyabV4c \
  "$OUT_DIR/Insiyab-film-v4c-raw.mp4" \
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
echo "--- PCM-domain loudness normalization (plain volume, NO alimiter) ---"
# CRITICAL: alimiter reverses gain on this machine — use volume= only
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4c-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/audio-raw.wav" 2>&1 | tail -3

echo "Raw loudness:"
ffmpeg -i "$OUT_DIR/audio-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA"

ffmpeg -y -i "$OUT_DIR/audio-raw.wav" \
  -af volume=-2.2dB \
  -acodec pcm_s24le "$OUT_DIR/audio-norm.wav" 2>&1 | tail -3

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4c-raw.mp4" \
  -i "$OUT_DIR/audio-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4c.mp4" 2>&1 | tail -5

echo ""
echo "--- Verifying final loudness ---"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4c.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA" || true

echo ""
echo "--- Rendering InsiyabV4cOpening (0-40s, ends on 1s ink hold) ---"
node_modules/.bin/remotion render v4c/root.jsx InsiyabV4cOpening \
  "$OUT_DIR/Insiyab-film-v4c-opening-raw.mp4" \
  --public-dir "$PUBLIC_DIR" \
  --codec h264 \
  --crf 18 \
  --audio-codec aac \
  --audio-bitrate "192k" \
  --concurrency 4 \
  --log info \
  --timeout 60000

echo ""
echo "--- Normalizing opening cut ---"
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4c-opening-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/opening-raw.wav" 2>&1 | tail -3

echo "Opening raw loudness:"
ffmpeg -i "$OUT_DIR/opening-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA"

ffmpeg -y -i "$OUT_DIR/opening-raw.wav" \
  -af volume=-4.8dB \
  -acodec pcm_s24le "$OUT_DIR/opening-norm.wav" 2>&1 | tail -3

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4c-opening-raw.mp4" \
  -i "$OUT_DIR/opening-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4c-opening.mp4" 2>&1 | tail -5

echo ""
echo "--- Final loudness check on opening ---"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4c-opening.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA" || true

echo ""
echo "--- File properties ---"
ffprobe -v error -show_entries format=duration,size -of json "$OUT_DIR/Insiyab-film-v4c.mp4"
ffprobe -v error -show_entries format=duration,size -of json "$OUT_DIR/Insiyab-film-v4c-opening.mp4"

echo ""
echo "--- SHA256 checksums ---"
shasum -a 256 "$OUT_DIR/Insiyab-film-v4c.mp4"
shasum -a 256 "$OUT_DIR/Insiyab-film-v4c-opening.mp4"

echo ""
echo "=== RENDER COMPLETE ==="
echo "Full film:  $OUT_DIR/Insiyab-film-v4c.mp4"
echo "Stage cut:  $OUT_DIR/Insiyab-film-v4c-opening.mp4"
echo "Time: $(date)"
