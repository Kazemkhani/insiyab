"""Verify the assembled Insiyab story film: streams, duration, frame count,
decoded headroom, and caption-to-cue alignment.

Usage:
    python3 web/film/verify-story.py <film.mp4> <cues.json> <script.json>

Exits 0 if every check passes, 1 otherwise.
"""
import array, json, math, pathlib, subprocess, sys

FILM    = pathlib.Path(sys.argv[1]).resolve()
CUES    = pathlib.Path(sys.argv[2]).resolve()
SCRIPT  = pathlib.Path(sys.argv[3]).resolve()

PEAK_LIMIT   = 0.85     # decoded stereo sample peak must be below this
ALIGN_LIMIT  = 0.3      # caption start may drift from cue slot_start by at most this many seconds

def run(args):
    return subprocess.check_output(args, text=True)

# --- 1. streams -----------------------------------------------------------
info = json.loads(run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_name,width,height,sample_rate,channels,duration,nb_frames',
    '-of', 'json', str(FILM),
]))
video = next(s for s in info['streams'] if s.get('codec_name') == 'h264')
sound = next(s for s in info['streams'] if s.get('codec_name') == 'aac')

assert (video['width'], video['height']) == (1920, 1080), \
    f"wrong resolution: {video['width']}x{video['height']}"
assert int(video['nb_frames']) == 1800, \
    f"wrong frame count: {video['nb_frames']}"
assert abs(float(info['format']['duration']) - 60.0) < 1/30, \
    f"wrong duration: {info['format']['duration']}"
assert sound['sample_rate'] == '48000', \
    f"wrong sample rate: {sound['sample_rate']}"
assert sound['channels'] == 2, \
    f"wrong channel count: {sound['channels']}"
print('PASS streams: 1800 frames, 1920x1080, 60.0 s, H.264 video + 48 kHz stereo AAC')

# --- 2. decoded headroom --------------------------------------------------
raw = subprocess.check_output([
    'ffmpeg', '-loglevel', 'error',
    '-i', str(FILM),
    '-vn', '-ac', '2', '-ar', '48000',
    '-f', 'f32le', '-',
])
samples = array.array('f')
samples.frombytes(raw)
peak = max(abs(x) for x in samples)
assert peak < PEAK_LIMIT, f"sample peak {peak:.4f} >= {PEAK_LIMIT}; mix is too loud"
print(f'PASS headroom: decoded stereo sample peak {peak:.4f} < {PEAK_LIMIT}')

# --- 3. caption alignment -------------------------------------------------
cues_data   = json.loads(CUES.read_text())
script_data = json.loads(SCRIPT.read_text())

cue_map = {c['id']: c for c in cues_data['cues']}
failures = []
checked  = 0
for line in script_data['lines']:
    lid = line['id']
    if lid not in cue_map:
        continue
    cue = cue_map[lid]
    diff = abs(line['start_s'] - cue['slot_start'])
    if diff > ALIGN_LIMIT:
        failures.append(
            f"  {lid}: script start {line['start_s']} s vs cue slot_start {cue['slot_start']} s "
            f"(diff {diff:.3f} s > {ALIGN_LIMIT} s)"
        )
    checked += 1

if failures:
    for f in failures:
        print('FAIL caption alignment:', f)
    sys.exit(1)

print(f'PASS alignment: {checked} captions matched cues within {ALIGN_LIMIT} s')
print('FILM PASS')
