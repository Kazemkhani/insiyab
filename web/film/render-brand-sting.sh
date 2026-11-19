#!/usr/bin/env bash
# render-brand-sting.sh — render the 6-second brand sting
# Usage: bash web/film/render-brand-sting.sh <output-dir> <media-dir>
# Output: <output-dir>/brand-sting.mp4  (H.264 + AAC 48 kHz)
#         <output-dir>/lockup-still.png
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ "$#" -lt 2 ]; then
  echo "Usage: bash web/film/render-brand-sting.sh <output-dir> <media-dir>"
  exit 2
fi

out_dir=$(mkdir -p "$1" && cd "$1" && pwd)
media_dir=$(cd "$2" && pwd)

echo "Output dir : $out_dir"
echo "Media dir  : $media_dir"

# ── 1. Install npm deps if needed ─────────────────────────────────────────────
if [ ! -d web/film/node_modules/@remotion/cli ]; then
  echo "Installing npm deps..."
  npm ci --prefix web/film --no-audit --no-fund
fi

# ── 2. Render silent video ─────────────────────────────────────────────────────
echo "Rendering BrandSting (silent)..."
cd web/film
node_modules/.bin/remotion render brand-sting.jsx BrandSting \
  "$out_dir/brand-sting-silent.mp4" \
  --public-dir "$media_dir" \
  --codec h264 \
  --crf 20 \
  --concurrency 2 \
  --log error
cd ../..

echo "Silent render done: $out_dir/brand-sting-silent.mp4"

# ── 3. Generate audio ──────────────────────────────────────────────────────────
echo "Generating audio..."
python3 -I scripts/gen-brand-audio.py "$out_dir/brand-sting-audio.wav"

# ── 4. Mux video + audio ───────────────────────────────────────────────────────
echo "Muxing audio..."
ffmpeg -y \
  -i "$out_dir/brand-sting-silent.mp4" \
  -i "$out_dir/brand-sting-audio.wav" \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -shortest \
  -movflags +faststart \
  "$out_dir/brand-sting.mp4"

# ── 5. Export still at final frame (frame 179) ────────────────────────────────
echo "Exporting final lockup still..."
ffmpeg -y \
  -i "$out_dir/brand-sting.mp4" \
  -vf "select=eq(n\,179)" -vframes 1 \
  "$out_dir/lockup-still.png"

# ── 6. Export check frames ─────────────────────────────────────────────────────
# 0.4s=12, 0.8s=24, 1.2s=36, 2.0s=60, 3.0s=90, 3.8s=114, 4.5s=135, 5.2s=156, 6.0s=179
echo "Exporting check frames..."
mkdir -p "$out_dir/frames"
for pair in "0.4:11" "0.8:23" "1.2:35" "2.0:59" "3.0:89" "3.8:113" "4.5:134" "5.2:155" "6.0:179"; do
  ts="${pair%%:*}"
  fn="${pair##*:}"
  ffmpeg -y \
    -i "$out_dir/brand-sting.mp4" \
    -vf "select=eq(n\,${fn})" -vframes 1 \
    "$out_dir/frames/frame-${ts}s.png" 2>/dev/null
done
echo "Check frames: $out_dir/frames/"

# ── 7. ffprobe ────────────────────────────────────────────────────────────────
echo "=== ffprobe brand-sting.mp4 ==="
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,bit_rate \
  -of default \
  "$out_dir/brand-sting.mp4"

echo "=== sha256 ==="
shasum -a 256 "$out_dir/brand-sting.mp4"
shasum -a 256 "$out_dir/lockup-still.png"

echo ""
echo "BRAND STING BUILT"
echo "Video : $out_dir/brand-sting.mp4"
echo "Still : $out_dir/lockup-still.png"
echo "Frames: $out_dir/frames/"
