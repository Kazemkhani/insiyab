#!/usr/bin/env bash
# render-v4e.sh — render Insiyab Film v4e (87s full + 40s opening + 60s stage cut)
# v4e changes from v4d:
#   - Word-level Caption.jsx for all 18 voice lines
#   - CallChain: "decides" flip at l13 word 1.720s, "confirms" cascade at 3.280s
#   - Timing fixes: lar2 +0.10s, l09 +0.10s, l12 +0.20s, l13 +0.15s
#   - Scene end ≥ last-word end + 0.5s for all 5 act2 scenes
# Usage: bash web/film/render-v4e.sh
# CRITICAL: NO alimiter — it reverses gain on this machine. Use volume= only.
set -euo pipefail
cd "$(dirname "$0")/../.."

PUBLIC_DIR="$HOME/work/insiyab-run/film/v4e/public"
OUT_DIR="$HOME/work/insiyab-run/film/v4e/out"
mkdir -p "$OUT_DIR"

echo "=== Insiyab Film v4e render ==="
echo "Time: $(date)"
echo "Public dir: $PUBLIC_DIR"
echo "Output: $OUT_DIR"

cd web/film

echo ""
echo "--- Rendering InsiyabV4e (full 87s) ---"
node_modules/.bin/remotion render v4e/root.jsx InsiyabV4e \
  "$OUT_DIR/Insiyab-film-v4e-raw.mp4" \
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
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4e-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/audio-raw.wav" 2>&1 | tail -3

echo "Raw loudness:"
ffmpeg -i "$OUT_DIR/audio-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA"

ffmpeg -y -i "$OUT_DIR/audio-raw.wav" \
  -af volume=-2.2dB \
  -acodec pcm_s24le "$OUT_DIR/audio-norm.wav" 2>&1 | tail -3

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4e-raw.mp4" \
  -i "$OUT_DIR/audio-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4e.mp4" 2>&1 | tail -5

echo ""
echo "--- Verifying final loudness ---"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4e.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA" || true

echo ""
echo "--- Rendering InsiyabV4eOpening (0-40s) ---"
node_modules/.bin/remotion render v4e/root.jsx InsiyabV4eOpening \
  "$OUT_DIR/Insiyab-film-v4e-opening-raw.mp4" \
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
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4e-opening-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/opening-raw.wav" 2>&1 | tail -3

echo "Opening raw loudness:"
ffmpeg -i "$OUT_DIR/opening-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA"

ffmpeg -y -i "$OUT_DIR/opening-raw.wav" \
  -af volume=-4.9dB \
  -acodec pcm_s24le "$OUT_DIR/opening-norm.wav" 2>&1 | tail -3

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4e-opening-raw.mp4" \
  -i "$OUT_DIR/opening-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4e-opening.mp4" 2>&1 | tail -5

echo ""
echo "--- Final loudness on opening ---"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4e-opening.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA" || true

echo ""
echo "--- Rendering 60s stage cut (InsiyabV4e, frames 0-1800) ---"
# 60s = 1800 frames at 30fps
# We render InsiyabV4e but trim output to 60s with ffmpeg
node_modules/.bin/remotion render v4e/root.jsx InsiyabV4e \
  "$OUT_DIR/Insiyab-film-v4e-stage60-raw.mp4" \
  --public-dir "$PUBLIC_DIR" \
  --codec h264 \
  --crf 18 \
  --audio-codec aac \
  --audio-bitrate "192k" \
  --frames 0-1799 \
  --concurrency 4 \
  --log info \
  --timeout 60000

echo ""
echo "--- Normalizing 60s stage cut ---"
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4e-stage60-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/stage60-raw.wav" 2>&1 | tail -3

echo "Stage-60s raw loudness:"
ffmpeg -i "$OUT_DIR/stage60-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA"

ffmpeg -y -i "$OUT_DIR/stage60-raw.wav" \
  -af volume=-3.1dB \
  -acodec pcm_s24le "$OUT_DIR/stage60-norm.wav" 2>&1 | tail -3

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4e-stage60-raw.mp4" \
  -i "$OUT_DIR/stage60-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4e-stage60.mp4" 2>&1 | tail -5

echo ""
echo "--- Final loudness on stage-60s cut ---"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4e-stage60.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True|LRA" || true

echo ""
echo "--- File properties ---"
ffprobe -v error -show_entries format=duration,size -of json "$OUT_DIR/Insiyab-film-v4e.mp4" || true
ffprobe -v error -show_entries format=duration,size -of json "$OUT_DIR/Insiyab-film-v4e-opening.mp4" || true
ffprobe -v error -show_entries format=duration,size -of json "$OUT_DIR/Insiyab-film-v4e-stage60.mp4" || true

echo ""
echo "--- SHA256 checksums ---"
shasum -a 256 "$OUT_DIR/Insiyab-film-v4e.mp4" || true
shasum -a 256 "$OUT_DIR/Insiyab-film-v4e-opening.mp4" || true
shasum -a 256 "$OUT_DIR/Insiyab-film-v4e-stage60.mp4" || true

echo ""
echo "=== RENDER COMPLETE ==="
echo "Full film:    $OUT_DIR/Insiyab-film-v4e.mp4"
echo "Opening cut:  $OUT_DIR/Insiyab-film-v4e-opening.mp4"
echo "Stage-60s:    $OUT_DIR/Insiyab-film-v4e-stage60.mp4"
echo "Time: $(date)"
