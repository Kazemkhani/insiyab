#!/usr/bin/env bash
# render-v4f.sh — render Insiyab Film v4f (87s full + ~73s stage cut)
# v4f changes from v4e:
#   - lar1 + lar2 Moteb voice (Saudi, s8AtpE08HrPmTUNmxgfQ)
#   - lar2 start: 45.3→44.6s; l09/ACT2_START: 48.7→47.3s
#   - l11 rewritten: "Which buses will run late. Which stops will wait longest." (3.944s)
#   - Map labels: "More riders than seats"→"Bus still out on its last trip" (ink)
#                 "41°C, long wait"→"Long wait at the stop" (redDark)
#   - Stage cut ~73s: 0 to frame 2121 (l12 "once." ends at 69.720s + 1.0s hold = 70.720s)
#     cut point from l12-align.json: last word "once." relative end 4.420s, l12.start 65.3s
#     abs end = 69.720s, +1.0s = 70.720s, as frames = 2121.6 → 2122 frames (0-2121)
#   - Stage cut: music fades over last 1.5s (afade t=out st=69.233 d=1.5)
# Usage: bash web/film/render-v4f.sh
# CRITICAL: NO alimiter — it reverses gain on this machine. Use volume= only.
set -euo pipefail
cd "$(dirname "$0")/../.."

PUBLIC_DIR="$HOME/work/insiyab-run/film/v4f/public"
OUT_DIR="$HOME/work/insiyab-run/film/v4f/out"
mkdir -p "$OUT_DIR"

echo "=== Insiyab Film v4f render ==="
echo "Time: $(date)"
echo "Public dir: $PUBLIC_DIR"
echo "Output: $OUT_DIR"

cd web/film

# ─────────────────────────────────────────────────────────────
# FULL FILM (87s, 2610 frames)
# ─────────────────────────────────────────────────────────────
echo ""
echo "--- Rendering InsiyabV4f (full 87s) ---"
node_modules/.bin/remotion render v4f/root.jsx InsiyabV4f \
  "$OUT_DIR/Insiyab-film-v4f-raw.mp4" \
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
echo "--- Measuring full film raw loudness ---"
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4f-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/full-raw.wav" -loglevel error

RAW_FULL=$(ffmpeg -i "$OUT_DIR/full-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep "I:" | awk '{print $2}' | head -1)
echo "Raw I = $RAW_FULL LUFS"

GAIN_FULL=$(python3 -c "print(round(-16.0 - float('${RAW_FULL}'), 2))")
echo "Applying volume=${GAIN_FULL}dB to reach -16 LUFS"

ffmpeg -y -i "$OUT_DIR/full-raw.wav" \
  -af "volume=${GAIN_FULL}dB" \
  -acodec pcm_s24le "$OUT_DIR/full-norm.wav" -loglevel error

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4f-raw.mp4" \
  -i "$OUT_DIR/full-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4f.mp4" 2>&1 | tail -3

echo "Full film loudness:"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4f.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True peak"

# ─────────────────────────────────────────────────────────────
# STAGE CUT (~73s / 2122 frames / 70.720s)
# l12 last word "once." abs end = 69.720s + 1.0s hold = 70.720s
# as frames: 70.720 × 30 = 2121.6 → render 0-2121 (2122 frames)
# music fade: last 1.5s = starts at 70.720 - 1.5 = 69.220s
# ─────────────────────────────────────────────────────────────
echo ""
echo "--- Rendering stage cut (0-2121, l12 last word + 1.0s hold) ---"
echo "    l12 'once.' abs end: 69.720s | +1.0s hold: 70.720s | 2122 frames"
node_modules/.bin/remotion render v4f/root.jsx InsiyabV4f \
  "$OUT_DIR/Insiyab-film-v4f-stage-raw.mp4" \
  --public-dir "$PUBLIC_DIR" \
  --codec h264 \
  --crf 18 \
  --audio-codec aac \
  --audio-bitrate "192k" \
  --frames 0-2121 \
  --concurrency 4 \
  --log info \
  --timeout 60000

echo ""
echo "--- Stage cut: applying music fade (last 1.5s) + loudness normalization ---"
ffmpeg -y -i "$OUT_DIR/Insiyab-film-v4f-stage-raw.mp4" \
  -vn -acodec pcm_s24le "$OUT_DIR/stage-raw.wav" -loglevel error

RAW_STAGE=$(ffmpeg -i "$OUT_DIR/stage-raw.wav" -af ebur128=peak=true \
  -f null - 2>&1 | grep "I:" | awk '{print $2}' | head -1)
echo "Stage raw I = $RAW_STAGE LUFS"

GAIN_STAGE=$(python3 -c "print(round(-16.0 - float('${RAW_STAGE}'), 2))")
echo "Applying volume=${GAIN_STAGE}dB to reach -16 LUFS"

# Apply gain + music fade (afade t=out starts at 69.220s, duration 1.5s)
# 70.720 - 1.5 = 69.220s
ffmpeg -y -i "$OUT_DIR/stage-raw.wav" \
  -af "volume=${GAIN_STAGE}dB,afade=t=out:st=69.220:d=1.500" \
  -acodec pcm_s24le "$OUT_DIR/stage-norm.wav" -loglevel error

ffmpeg -y \
  -i "$OUT_DIR/Insiyab-film-v4f-stage-raw.mp4" \
  -i "$OUT_DIR/stage-norm.wav" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT_DIR/Insiyab-film-v4f-stage.mp4" 2>&1 | tail -3

echo "Stage cut loudness:"
ffmpeg -i "$OUT_DIR/Insiyab-film-v4f-stage.mp4" -af ebur128=peak=true \
  -f null - 2>&1 | grep -E "I:|True peak"

# ─────────────────────────────────────────────────────────────
# RMS fade verification (stage cut, last 4s in 0.5s windows)
# ─────────────────────────────────────────────────────────────
echo ""
echo "--- Stage cut: RMS per 0.5s over final 4s (fade to below -40 dB) ---"
python3 -I - "$OUT_DIR/stage-norm.wav" << 'PYEOF'
import sys, subprocess, struct, math, numpy as np

wav_path = sys.argv[1]
# Decode to raw PCM
r = subprocess.run([
    "ffmpeg", "-y", "-i", wav_path,
    "-ac", "1", "-ar", "48000", "-f", "s16le", "-"
], capture_output=True)
samples = np.frombuffer(r.stdout, dtype=np.int16).astype(float) / 32768.0
sr = 48000
dur = len(samples) / sr

start_t = dur - 4.0
start_i = max(0, int(start_t * sr))
seg = samples[start_i:]

win = int(0.5 * sr)
print(f"{'Time':>10}  {'RMS dB':>8}")
for i in range(0, len(seg), win):
    chunk = seg[i:i+win]
    if len(chunk) < win // 2:
        break
    rms = math.sqrt(max(1e-18, float(np.mean(chunk**2))))
    db = 20 * math.log10(rms)
    t = start_t + i / sr
    print(f"{t:>8.2f}s  {db:>8.1f} dB")
PYEOF

# ─────────────────────────────────────────────────────────────
# FILE PROPERTIES, SHA256
# ─────────────────────────────────────────────────────────────
echo ""
echo "--- File properties ---"
for f in "$OUT_DIR/Insiyab-film-v4f.mp4" "$OUT_DIR/Insiyab-film-v4f-stage.mp4"; do
  echo "--- $f ---"
  ffprobe -v error -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 "$f" || true
done

echo ""
echo "--- ebur128 final ---"
for f in "$OUT_DIR/Insiyab-film-v4f.mp4" "$OUT_DIR/Insiyab-film-v4f-stage.mp4"; do
  echo "--- $(basename $f) ---"
  ffmpeg -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|True peak|LRA" || true
done

echo ""
echo "--- SHA256 checksums ---"
shasum -a 256 "$OUT_DIR/Insiyab-film-v4f.mp4" || true
shasum -a 256 "$OUT_DIR/Insiyab-film-v4f-stage.mp4" || true

echo ""
echo "=== RENDER COMPLETE ==="
echo "Full film:   $OUT_DIR/Insiyab-film-v4f.mp4"
echo "Stage cut:   $OUT_DIR/Insiyab-film-v4f-stage.mp4"
echo "Time: $(date)"
