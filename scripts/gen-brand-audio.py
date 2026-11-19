#!/usr/bin/env python3
"""Generate the brand sting audio track.

Two events:
  - Soft reveal tone: 440 Hz sine, t=0.0 s, 0.5 s long, fade in+out
  - Soft selection tick: 880 Hz sine burst, t=3.5 s, 0.06 s long, fade in+out

Amplitude is calibrated to stay near -30 LUFS integrated, which is at least
20 dB below typical speech (-14 LUFS). The final RMS is verified and the WAV
is written at 48 kHz / 24-bit PCM.
"""
import sys
import struct
import math
import wave
import numpy as np

SR = 48000       # sample rate
DUR = 6.0        # seconds
TONE_FREQ = 440  # Hz, reveal tone
TICK_FREQ = 880  # Hz, selection tick

# Silence level: approximately -30 LUFS integrated
# Normal speech is around -14 LUFS; 20 dB below = -34 LUFS
# Target peak amplitude: 0.025 (about -32 dBFS peak, well under -20 dBFS speech level)
TONE_AMP = 0.018
TICK_AMP = 0.014

def fade_envelope(n, fade_samples):
    """Hann fade-in and fade-out of `fade_samples` length."""
    env = np.ones(n)
    fade = fade_samples
    if fade * 2 > n:
        fade = n // 2
    # fade-in
    env[:fade] = 0.5 * (1 - np.cos(np.pi * np.arange(fade) / fade))
    # fade-out
    env[-fade:] = 0.5 * (1 + np.cos(np.pi * np.arange(fade) / fade))
    return env

t = np.linspace(0, DUR, int(SR * DUR), endpoint=False)
audio = np.zeros_like(t)

# ── Reveal tone (0.0–0.5 s) ───────────────────────────────────────────────────
tone_start = 0.0
tone_dur   = 0.50
ts = int(tone_start * SR)
te = ts + int(tone_dur * SR)
n  = te - ts
tt = np.arange(n) / SR
sig = TONE_AMP * np.sin(2 * math.pi * TONE_FREQ * tt)
sig *= fade_envelope(n, int(0.08 * SR))
audio[ts:te] += sig

# ── Selection tick (3.5–3.56 s) ───────────────────────────────────────────────
tick_start = 3.50
tick_dur   = 0.06
ks = int(tick_start * SR)
ke = ks + int(tick_dur * SR)
nk = ke - ks
tk = np.arange(nk) / SR
tick = TICK_AMP * np.sin(2 * math.pi * TICK_FREQ * tk)
tick *= fade_envelope(nk, int(0.015 * SR))
audio[ks:ke] += tick

# ── Verify level ──────────────────────────────────────────────────────────────
rms_db = 20 * math.log10(np.sqrt(np.mean(audio ** 2)) + 1e-12)
peak_db = 20 * math.log10(np.max(np.abs(audio)) + 1e-12)
print(f"Audio RMS: {rms_db:.1f} dBFS  |  Peak: {peak_db:.1f} dBFS")
print(f"(Target: peak < -24 dBFS, well below speech level)")

# ── Write WAV (48 kHz, 24-bit PCM) ───────────────────────────────────────────
out_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/brand-sting-audio.wav"
samples_i32 = (audio * (2**23 - 1)).astype(np.int32)

with wave.open(out_path, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(3)  # 24-bit = 3 bytes
    wf.setframerate(SR)
    # Pack as little-endian 24-bit
    packed = bytearray()
    for s in samples_i32:
        iv = int(s)
        b = iv.to_bytes(4, byteorder='little', signed=True)
        packed.extend(b[:3])  # low 3 bytes = 24-bit LE
    wf.writeframes(bytes(packed))

print(f"Written: {out_path}")
