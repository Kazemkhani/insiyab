#!/usr/bin/env python3
"""The sound of the one-minute film (docs/FILM-SCRIPT.md): the voice, the recorded effects, the effects made here, and the mix.

  python3 tools/make_film_sound.py voice --key-file <env file with ELEVENLABS_API_KEY> [--force]
  python3 tools/make_film_sound.py effects --key-file <env file>                     [--force]
  python3 tools/make_film_sound.py mix                                               (needs numpy and ffmpeg; makes no paid call)

Everything is written to ~/work/insiyab-run/film/audio/ (or --out), outside git. The key is read from the file named and is never
printed. `voice` and `effects` are the only paid calls; each skips a file that already exists unless --force is given, and each
prints how many characters or seconds it asked for. The mix can be rebuilt as often as wanted for nothing.

The shape of the sound follows the story. The problem is built up: a pulse that quickens, a drone a semitone out of tune, a clock
that runs faster, a rising noise. At 29.0 seconds it is cut to silence, on the line that says nobody did anything wrong. The solution
is the opposite of each thing: a slow steady tick, a chord that is in tune, and room around the voice."""
import json, os, subprocess, sys, urllib.request, wave

OUT = os.path.expanduser("~/work/insiyab-run/film/audio")
VOICE = ("j9jfwdrw7BRfcR43Qohk", "Frederick Surrey: a calm British man, a storyteller")
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.6, "similarity_boost": 0.8, "style": 0.1, "use_speaker_boost": True}
SR = 48000
LENGTH = 60.0
DROP = 29.0                      # the cut to silence: the turn from the problem to the answer

# The words, and the second each line starts. The voice says no number: numbers are drawn on the panels from the bundle.
LINES = [
    (0.6, "Five in the morning. He is already awake."),
    (4.6, "The bus is his way to work."),
    (8.6, "It comes. And it is full."),
    (13.0, "No seat."),
    (15.6, "On another route, on another trip, a bigger bus runs almost empty."),
    (22.0, "Too many people here. Too many empty seats there. And no timetable shows it."),
    (29.6, "Nobody did anything wrong. The timetable was written before the day happened."),
    (35.0, "Insiyab replays the day, minute by minute, and looks ahead."),
    (38.8, "It forecasts how many will board at each stop, up to two hours ahead. And how late each bus will be, stops before it arrives."),
    (47.5, "So a planner can put the bigger bus where the people are."),
    (50.7, "And a passenger can choose the bus with room, and be thanked for it."),
    (54.6, "Same buses. Same drivers. A seat for the journey."),
    (58.4, "Insiyab."),
]
# Recorded effects: (file, what to ask for, seconds, start in the film, level)
EFFECTS = [
    ("street-dawn", "Quiet city street before sunrise, distant traffic hum, a few birds, light wind, calm ambience, no music", 9.0, 0.0, 0.5),
    ("bus-arrives", "A city bus approaches and pulls up at a stop, engine rumble, air brakes hiss loudly, doors open with a pneumatic sound", 6.0, 6.6, 0.8),
    ("crowded-bus", "Inside a packed commuter bus, tense crowd murmur, people pressed together, engine drone, rattling handrails, no speech that can be understood", 9.0, 12.4, 0.55),
    ("city-rush", "Busy city traffic at rush hour, impatient car horns, engines, urgent and stressful, building intensity", 9.0, 19.6, 0.5),
    ("bus-leaves", "City bus doors close softly and the bus pulls away smoothly, engine fading into the distance, calm", 5.0, 54.8, 0.6),
]


def key_from(path):
    for line in open(os.path.expanduser(path), encoding="utf-8"):
        name, _, value = line.strip().partition("=")
        if name.replace("export ", "").strip() in ("ELEVENLABS_API_KEY", "ELEVEN_API_KEY"):
            return value.strip().strip('"').strip("'")
    raise SystemExit("no ELEVENLABS_API_KEY in " + path)


def ask(url, key, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"xi-api-key": key, "content-type": "application/json", "accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def voice(key, out, force):
    os.makedirs(out, exist_ok=True); asked = 0
    for i, (_, text) in enumerate(LINES, 1):
        path = os.path.join(out, f"vo-{i:02d}.mp3")
        if os.path.exists(path) and not force:
            print(f"KEPT {os.path.basename(path)}"); continue
        open(path, "wb").write(ask(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE[0]}?output_format=mp3_44100_128", key, {"text": text, "model_id": MODEL, "voice_settings": SETTINGS}))
        asked += len(text); print(f"MADE {os.path.basename(path)} ({len(text)} characters)")
    print(f"voice: {asked} characters asked for this run, voice {VOICE[1]}")


def effects(key, out, force):
    os.makedirs(out, exist_ok=True); asked = 0
    for name, text, seconds, _, _ in EFFECTS:
        path = os.path.join(out, f"fx-{name}.mp3")
        if os.path.exists(path) and not force:
            print(f"KEPT {os.path.basename(path)}"); continue
        open(path, "wb").write(ask("https://api.elevenlabs.io/v1/sound-generation", key, {"text": text, "duration_seconds": seconds, "prompt_influence": 0.45}))
        asked += seconds; print(f"MADE {os.path.basename(path)} ({seconds} seconds)")
    print(f"effects: {asked} seconds asked for this run")


def mix(out):
    import numpy as np
    n = int(SR * LENGTH); t = np.arange(n) / SR; rng = np.random.default_rng(20251215)

    def load(path):
        """Any audio file as mono float samples at SR, by way of ffmpeg."""
        raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

    def place(track, clip, start, level=1.0, fade_in=0.02, fade_out=0.05):
        clip = clip.copy(); a, b = int(fade_in * SR), int(fade_out * SR)
        if a and len(clip) > a: clip[:a] *= np.linspace(0, 1, a)
        if b and len(clip) > b: clip[-b:] *= np.linspace(1, 0, b)
        i = int(start * SR); j = min(n, i + len(clip))
        if j > i: track[i:j] += level * clip[: j - i]

    def burst(freq, seconds, decay):
        x = np.arange(int(seconds * SR)) / SR
        return np.sin(2 * np.pi * freq * x) * np.exp(-x / decay)

    def smooth(x, seconds):
        k = max(1, int(seconds * SR)); c = np.cumsum(np.insert(x, 0, 0.0)); return (c[k:] - c[:-k]) / k

    tension, release, cues = np.zeros(n), np.zeros(n), []

    # --- the problem: a pulse that quickens. 56 beats a minute at dawn, 150 at the worst of it, and nothing after the cut.
    beat = 0.9
    while beat < DROP - 0.25:
        bpm = 56 if beat < 5 else (56 + (92 - 56) * (beat - 5) / 9 if beat < 14 else 92 + (150 - 92) * (beat - 14) / (DROP - 14))
        level = 0.35 + 0.5 * min(1.0, beat / DROP)
        place(tension, burst(52, 0.28, 0.07), beat, level); place(tension, burst(46, 0.24, 0.06), beat + 0.16 * 60 / bpm * 1.1, level * 0.7)
        beat += 60.0 / bpm
    # a drone a semitone out of tune with itself, growing from the moment the bus arrives
    grow = np.clip((t - 6.0) / (DROP - 6.0), 0, 1) ** 1.6 * (t < DROP)
    wobble = 1 + 0.35 * np.sin(2 * np.pi * (1.5 + 5 * grow) * t)
    tension += 0.16 * grow * wobble * (np.sin(2 * np.pi * 73.42 * t) + np.sin(2 * np.pi * 77.78 * t) + 0.5 * np.sin(2 * np.pi * 146.83 * t) + 0.35 * np.sin(2 * np.pi * 155.56 * t))
    # a clock that runs faster and faster
    tick, gap = 14.0, 0.5
    while tick < DROP - 0.1:
        place(tension, burst(2100, 0.04, 0.008), tick, 0.16 + 0.2 * (tick - 14) / (DROP - 14)); cues.append(("tick", round(tick, 2)))
        gap = max(0.11, gap * 0.955); tick += gap
    # a rising noise and a rising tone into the cut
    rise = np.clip((t - 20.5) / (DROP - 20.5), 0, 1) * (t < DROP)
    noise = rng.standard_normal(n); bright = noise - np.pad(smooth(noise, 0.0012), (0, n - len(smooth(noise, 0.0012))))
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 1500 * rise ** 2) / SR)
    tension += 0.22 * rise ** 2.4 * bright[:n] + 0.10 * rise ** 2 * sweep
    # the cut: one short low blow, and then nothing at all until the voice
    place(release, burst(48, 0.3, 0.05), DROP, 0.9, fade_in=0.002, fade_out=0.12)                              # short: by a third of a second there is silence, and the voice enters into it

    # --- the answer: everything the problem was not. A chord in tune, a slow steady tick, and room.
    pad_in = np.clip((t - 34.8) / 4.0, 0, 1) ** 1.5 * np.clip((LENGTH - 0.2 - t) / 2.6, 0, 1)
    shimmer = 1 + 0.06 * np.sin(2 * np.pi * 0.23 * t)
    for freq, level in ((146.83, 1.0), (220.0, 0.8), (293.66, 0.6), (369.99, 0.5), (440.0, 0.25)):          # D major, spread
        release += 0.055 * level * pad_in * shimmer * (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 1.003 * t))
    for s in np.arange(36.0, 54.1, 1.0):                                                                        # once a second: order
        place(release, burst(1500, 0.05, 0.012), s, 0.09)
    for clip_name, start, level in (("whoosh", 15.4, 0.6), ("page-turn", 47.4, 0.5), ("beat", 47.5, 0.7), ("chime", 51.9, 0.7), ("card-tap", 53.5, 0.7)):
        path = os.path.join(out, clip_name + ".wav")
        if os.path.exists(path): place(release, load(path), start, level); cues.append((clip_name, start))

    recorded = np.zeros(n); missing = []
    for name, _, seconds, start, level in EFFECTS:
        path = os.path.join(out, f"fx-{name}.mp3")
        if not os.path.exists(path): missing.append(name); continue
        clip = load(path)
        if start < DROP: clip = clip[: max(0, int((DROP - start) * SR))]                                    # nothing of the problem survives the cut
        place(recorded, clip, start, level, fade_in=0.6, fade_out=0.02 if start < DROP else 1.2); cues.append((name, start))

    spoken = np.zeros(n); ends = []
    for i, (start, text) in enumerate(LINES, 1):
        path = os.path.join(out, f"vo-{i:02d}.mp3")
        if not os.path.exists(path): missing.append(f"vo-{i:02d}"); continue
        clip = load(path); peak = np.abs(clip).max() or 1.0; clip = clip / peak * 0.85
        place(spoken, clip, start, 1.0, fade_in=0.005, fade_out=0.03); ends.append((i, start, round(start + len(clip) / SR, 2), text)); cues.append((f"vo-{i:02d}", start))
    clash = [(a[0], b[0], round(a[2] - b[1], 2)) for a, b in zip(ends, ends[1:]) if a[2] > b[1] - 0.05]

    # the voice is never fought: everything else drops under it and comes back when it stops
    under = np.pad(smooth(np.abs(spoken), 0.25), (0, n))[:n]; duck = 1 - 0.62 * np.clip(under / 0.05, 0, 1)
    bed = (tension + recorded + release) * duck
    full = spoken + bed
    full = np.tanh(full * 1.15) * 0.92                                                                         # a soft ceiling at 0.92 of full scale, so nothing clips

    def save(name, x):
        with wave.open(os.path.join(out, name), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            pcm = (np.clip(x, -1, 1) * 32767).astype("<i2"); w.writeframes(np.column_stack([pcm, pcm]).tobytes())
    save("soundtrack.wav", full); save("stem-voice.wav", spoken); save("stem-effects.wav", np.tanh(bed * 1.15) * 0.92)
    json.dump({"length_seconds": LENGTH, "drop_at": DROP, "sample_rate": SR, "voice": VOICE[1],
               "lines": [{"n": i, "start": s, "end": e, "text": text} for i, s, e, text in ends], "cues": sorted([{"what": w_, "at": a} for w_, a in cues if w_ != "tick"], key=lambda c: c["at"])},
              open(os.path.join(out, "cues.json"), "w"), indent=1)
    loud = lambda a, b: round(float(np.sqrt(np.mean(full[int(a * SR):int(b * SR)] ** 2))), 4)
    print(f"WROTE soundtrack.wav, stem-voice.wav, stem-effects.wav and cues.json to {out}")
    print(f"loudness (RMS): dawn 0-5s {loud(0, 5)}, build 20-29s {loud(20, 29)}, the quarter second before the voice returns {loud(DROP + 0.34, DROP + 0.59)}, answer 36-54s {loud(36, 54)}; peak {round(float(np.abs(full).max()), 3)}")
    for i, s, e, text in ends:
        print(f"  line {i:>2}  {s:5.1f} to {e:5.2f}  {text}")
    if clash: print("CLASH: a line runs into the next (line, next line, seconds over):", clash)
    if missing: print("MISSING, mixed without:", ", ".join(missing))
    return 1 if clash else 0


def main():
    a = sys.argv[1:]
    if not a or a[0] not in ("voice", "effects", "mix"):
        print(__doc__); return 2
    out = a[a.index("--out") + 1] if "--out" in a else OUT
    if a[0] == "mix":
        return mix(out)
    if "--key-file" not in a:
        print("--key-file is needed: the file that holds ELEVENLABS_API_KEY"); return 2
    key = key_from(a[a.index("--key-file") + 1])
    (voice if a[0] == "voice" else effects)(key, out, "--force" in a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
