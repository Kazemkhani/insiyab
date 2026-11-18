#!/usr/bin/env python3
"""Generate a static SVG dot map of Dubai bus stops (ac_shelter vs pole).

Usage: python3 gen_stops_map.py
Output: story/deck/assets/stops-map.svg
"""
import csv, os, sys

# path resolution
script_dir = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(script_dir, '..', '..', '..', '..', '..')
# try both locations
candidates = [
    os.path.join(script_dir, '..', '..', '..', 'opendata', 'public', 'bus-stops.csv'),
    os.path.join(root, 'opendata', 'public', 'bus-stops.csv'),
]
csv_path = None
for c in candidates:
    if os.path.exists(c):
        csv_path = c
        break

if csv_path is None:
    # try cwd-relative
    csv_path = 'opendata/public/bus-stops.csv'

out_path = os.path.join(script_dir, '..', 'assets', 'stops-map.svg')
out_path = os.path.normpath(out_path)

# Read stops
stops = []
with open(csv_path, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['stop_kind'] not in ('ac_shelter', 'pole'):
            continue
        try:
            lat = float(row['latitude'])
            lon = float(row['longitude'])
        except ValueError:
            continue
        # Dubai bounding box
        if not (24.80 <= lat <= 25.32 and 54.98 <= lon <= 55.62):
            continue
        stops.append({'lat': lat, 'lon': lon, 'kind': row['stop_kind']})

ac_stops  = [s for s in stops if s['kind'] == 'ac_shelter']
pole_stops = [s for s in stops if s['kind'] == 'pole']

# SVG canvas
W, H = 1200, 540
PAD_L, PAD_R, PAD_T, PAD_B = 60, 60, 40, 80

# Map bounds (lon -> x, lat -> y)
LON_MIN, LON_MAX = 54.98, 55.62
LAT_MIN, LAT_MAX = 24.80, 25.32

def px(lon, lat):
    x = PAD_L + (lon - LON_MIN) / (LON_MAX - LON_MIN) * (W - PAD_L - PAD_R)
    y = PAD_T + (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * (H - PAD_T - PAD_B)
    return x, y

# Colour palette (brand)
INK = '#15181D'
INK40 = 'rgba(21,24,29,0.70)'
RED  = '#C42B2B'
TEAL = '#2E7D6B'
IVORY = '#F7F5F0'
GOLD = '#9C7B3E'
MUTE = '#A9AEB5'

def dot(lon, lat, r, fill, opacity=1.0):
    x, y = px(lon, lat)
    if opacity < 1:
        return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}" fill-opacity="{opacity:.2f}"/>'
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}"/>'

# Build SVG
lines = []
lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Dubai bus stop kinds: air-conditioned shelters (ink) and bare poles (red)">')
# background
lines.append(f'<rect width="{W}" height="{H}" fill="{IVORY}"/>')

# Draw pole stops first (behind)
for s in pole_stops:
    lines.append(dot(s['lon'], s['lat'], 3.5, RED, 0.72))

# Draw ac_shelter on top
for s in ac_stops:
    lines.append(dot(s['lon'], s['lat'], 4.5, INK, 0.85))

# Legend
LEG_X, LEG_Y = PAD_L, H - PAD_B + 16
lines.append(f'<circle cx="{LEG_X+8}" cy="{LEG_Y+6}" r="6" fill="{INK}"/>')
lines.append(f'<text x="{LEG_X+22}" y="{LEG_Y+11}" font-family="\'IBM Plex Sans\',\'Helvetica Neue\',Arial,sans-serif" font-size="17" fill="{INK}">Air-conditioned shelter</text>')

lines.append(f'<circle cx="{LEG_X+248}" cy="{LEG_Y+6}" r="6" fill="{RED}"/>')
lines.append(f'<text x="{LEG_X+262}" y="{LEG_Y+11}" font-family="\'IBM Plex Sans\',\'Helvetica Neue\',Arial,sans-serif" font-size="17" fill="{INK}">Bare pole</text>')

# Count labels (right of legend)
lines.append(f'<text x="{W - PAD_R}" y="{LEG_Y+11}" text-anchor="end" font-family="\'IBM Plex Sans\',\'Helvetica Neue\',Arial,sans-serif" font-size="17" fill="{INK}" font-weight="600">{len(ac_stops)} shelters · {len(pole_stops)} poles</text>')

lines.append('</svg>')

svg = '\n'.join(lines)
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(svg)

print(f'Written {out_path} ({len(ac_stops)} ac_shelter, {len(pole_stops)} pole, total dots: {len(stops)})')
