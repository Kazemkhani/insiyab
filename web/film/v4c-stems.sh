#!/usr/bin/env bash
# v4c-stems.sh — Export separate audio stems + cue sheet for v4c
# Stems: voice-en, voice-ar, music, sfx, ambience (48 kHz WAV, 24-bit)
# Cue sheet: CSV with all audio events
set -euo pipefail

WORK="$HOME/work/insiyab-run/film/v4c"
STEMS="$WORK/stems"
VOX="$WORK/public/audio/voice"
SFX="$WORK/public/audio/sfx"
MUSIC="$HOME/work/insiyab-run/film/v4/public/audio"
mkdir -p "$STEMS"

DURATION=84.0  # total film seconds
SAMPLE_RATE=48000
FPS=30

# Helper: silence bed of given duration at 48kHz
silence_bed() {
  ffmpeg -y -f lavfi -i "anullsrc=r=48000:cl=stereo" \
    -t "$DURATION" -acodec pcm_s24le -ar 48000 "$1" 2>/dev/null
}

# Helper: mix a source file into a stem at offset (seconds), with volume
# Usage: mix_in <stem_wav> <src_file> <offset_sec> <volume>
mix_in() {
  local stem=$1 src=$2 offset=$3 vol=$4
  local tmp="${stem%.wav}.tmp$$.wav"
  ffmpeg -y \
    -i "$stem" \
    -ss 0 -i "$src" \
    -filter_complex "[1:a]volume=${vol},adelay=$(python3 -c "print(int($offset*1000))")|$(python3 -c "print(int($offset*1000))")":all=1[delayed]; [0:a][delayed]amix=inputs=2:duration=first[out]" \
    -map "[out]" -acodec pcm_s24le -ar 48000 \
    "$tmp" 2>/dev/null && mv "$tmp" "$stem"
}

echo "=== Creating stem beds ==="
silence_bed "$STEMS/voice-en.wav"
silence_bed "$STEMS/voice-ar.wav"
silence_bed "$STEMS/music.wav"
silence_bed "$STEMS/sfx.wav"
silence_bed "$STEMS/ambience.wav"

echo "=== Mixing stems ==="

# --- MUSIC stem ---
echo "  music..."
mix_in "$STEMS/music.wav"    "$MUSIC/act1.mp3"   0.0     0.65
mix_in "$STEMS/music.wav"    "$MUSIC/act2.mp3"   46.0    0.60

# --- AMBIENCE stem ---
echo "  ambience..."
mix_in "$STEMS/ambience.wav" "$SFX/city-evening.mp3"  0.0    0.25
mix_in "$STEMS/ambience.wav" "$SFX/dawn-ambience.mp3" 43.0   0.30

# --- SFX stem ---
echo "  sfx..."
mix_in "$STEMS/sfx.wav" "$SFX/bus-brakes.mp3"      5.0    0.40
mix_in "$STEMS/sfx.wav" "$SFX/clock-tick.mp3"      18.0   0.30
mix_in "$STEMS/sfx.wav" "$SFX/city-evening.mp3"    25.6   0.25
mix_in "$STEMS/sfx.wav" "$SFX/phone-ring.mp3"      26.0   0.50
mix_in "$STEMS/sfx.wav" "$SFX/phone-ring-2.mp3"    29.0   0.60
mix_in "$STEMS/sfx.wav" "$SFX/phone-ring.mp3"      32.0   0.50
mix_in "$STEMS/sfx.wav" "$SFX/heartbeat.mp3"       34.0   0.60
mix_in "$STEMS/sfx.wav" "$SFX/riser.mp3"           33.0   0.70
mix_in "$STEMS/sfx.wav" "$SFX/sub-drop.mp3"        37.933 0.90
mix_in "$STEMS/sfx.wav" "$SFX/heartbeat.mp3"       38.0   0.35
mix_in "$STEMS/sfx.wav" "$SFX/reverse-swell.mp3"   39.2   0.55
mix_in "$STEMS/sfx.wav" "$SFX/warm-chord.mp3"      41.6   0.60
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  42.67  0.50
mix_in "$STEMS/sfx.wav" "$SFX/soft-tone.mp3"       41.3   0.50
mix_in "$STEMS/sfx.wav" "$SFX/airy-shimmer.mp3"    42.0   0.35
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  46.0   0.40
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  46.333 0.37
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  46.667 0.34
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  47.0   0.30
mix_in "$STEMS/sfx.wav" "$SFX/ui-tick.mp3"         52.0   0.50
mix_in "$STEMS/sfx.wav" "$SFX/ui-tick.mp3"         52.667 0.50
mix_in "$STEMS/sfx.wav" "$SFX/ui-tick.mp3"         53.333 0.50
mix_in "$STEMS/sfx.wav" "$SFX/confirm.mp3"         66.0   0.60
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  67.0   0.55
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  67.667 0.55
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  68.333 0.55
mix_in "$STEMS/sfx.wav" "$SFX/received-chime.mp3"  69.0   0.55
mix_in "$STEMS/sfx.wav" "$SFX/whoosh.mp3"          70.0   0.40

# --- VOICE-EN stem ---
echo "  voice-en..."
mix_in "$STEMS/voice-en.wav" "$VOX/l01.mp3"  2.0  1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l02.mp3"  5.0  1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l03.mp3"  11.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l04.mp3"  14.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l05.mp3"  17.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l06.mp3"  21.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l07.mp3"  27.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l08.mp3"  32.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l09.mp3"  46.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l10.mp3"  51.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l11.mp3"  56.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l12.mp3"  62.5 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l13.mp3"  68.5 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l14.mp3"  73.0 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l15.mp3"  80.5 1.0
mix_in "$STEMS/voice-en.wav" "$VOX/l16.mp3"  82.5 1.0

# --- VOICE-AR stem ---
echo "  voice-ar... [NEEDS NATIVE-SPEAKER CHECK]"
mix_in "$STEMS/voice-ar.wav" "$VOX/lar1.mp3" 42.5 0.95
mix_in "$STEMS/voice-ar.wav" "$VOX/lar2.mp3" 44.0 0.95

echo ""
echo "=== Measuring stem loudness ==="
for stem in voice-en voice-ar music sfx ambience; do
  echo -n "  $stem: "
  ffmpeg -i "$STEMS/${stem}.wav" -af ebur128=peak=true -f null - 2>&1 | grep "I:" | head -1 || echo "(silence)"
done

echo ""
echo "=== Writing cue sheet ==="
CUE="$STEMS/cue-sheet.csv"
cat > "$CUE" << 'CUEEOF'
cue,in,out,stem,asset,prompt_or_source,licence
1,0.000,38.000,music,act1.mp3,Licensed background music Act 1,project-asset
2,46.000,84.000,music,act2.mp3,Licensed background music Act 2,project-asset
3,0.000,38.000,ambience,city-evening.mp3,City evening ambient bed,project-asset
4,43.000,58.000,ambience,dawn-ambience.mp3,"peaceful warm morning ambience, distant soft city sounds, gentle birds, golden dawn, 15s" (ElevenLabs sound gen),elevenlabs-sound-generation
5,2.000,3.600,voice-en,l01.mp3,Narration l01 "Six in the evening.",elevenlabs-tts
6,5.000,8.100,voice-en,l02.mp3,Narration l02 "Fifty thousand people...",elevenlabs-tts
7,11.000,13.100,voice-en,l03.mp3,Narration l03 "A nurse...",elevenlabs-tts
8,14.000,16.100,voice-en,l04.mp3,Narration l04 "A worker...",elevenlabs-tts
9,17.000,19.900,voice-en,l05.mp3,Narration l05 "A student...",elevenlabs-tts
10,21.000,23.300,voice-en,l06.mp3,Narration l06 "Nearly half...",elevenlabs-tts
11,27.000,30.600,voice-en,l07.mp3,Narration l07 "In the control room...",elevenlabs-tts
12,32.000,34.400,voice-en,l08.mp3,Narration l08 "Every problem...",elevenlabs-tts
13,46.000,47.900,voice-en,l09.mp3,Narration l09 "What if the control room saw it coming?",elevenlabs-tts
14,51.000,54.200,voice-en,l10.mp3,Narration l10 "Insiyab watches...",elevenlabs-tts
15,56.000,62.200,voice-en,l11.mp3,Narration l11 "Which buses...",elevenlabs-tts
16,62.500,68.200,voice-en,l12.mp3,Narration l12 "It suggests...",elevenlabs-tts
17,68.500,72.500,voice-en,l13.mp3,Narration l13 "One briefing...",elevenlabs-tts
18,73.000,79.900,voice-en,l14.mp3,Narration l14 "On two thousand evening trips...",elevenlabs-tts
19,80.500,82.100,voice-en,l15.mp3,Narration l15 "Insiyab sees it coming.",elevenlabs-tts
20,82.500,83.900,voice-en,l16.mp3,Narration l16 "The controller decides.",elevenlabs-tts
21,42.500,44.700,voice-ar,lar1.mp3,"انسياب [NEEDS NATIVE-SPEAKER CHECK] Yousuf - Cinematic Emirati Narrator (ID: WcswLmU3iGeMrhxfWXKN) eleven_v3",elevenlabs-tts
22,44.000,46.800,voice-ar,lar2.mp3,"المدينة تشوف اللي جاي [NEEDS NATIVE-SPEAKER CHECK] Yousuf - Cinematic Emirati Narrator (ID: WcswLmU3iGeMrhxfWXKN) eleven_v3",elevenlabs-tts
23,5.000,8.000,sfx,bus-brakes.mp3,Bus brakes SFX,project-asset
24,18.000,38.000,sfx,clock-tick.mp3,Clock ticking tension build,project-asset
25,25.600,26.200,sfx,city-evening.mp3,J-cut: pre-load 0.4s before control room,project-asset
26,26.000,30.000,sfx,phone-ring.mp3,Phone ring SFX,project-asset
27,29.000,33.000,sfx,phone-ring-2.mp3,Phone ring 2 SFX,project-asset
28,32.000,36.000,sfx,phone-ring.mp3,Phone ring SFX,project-asset
29,34.000,38.000,sfx,heartbeat.mp3,Heartbeat SFX,project-asset
30,33.000,38.000,sfx,riser.mp3,Riser SFX,project-asset
31,37.933,39.933,sfx,sub-drop.mp3,Sub boom (J-cut 2: leads by 2 frames),project-asset
32,38.000,39.500,sfx,heartbeat.mp3,Fading heartbeat in Turn,project-asset
33,39.200,41.700,sfx,reverse-swell.mp3,"cinematic orchestral reverse swell, rising from deep silence, 2s" (ElevenLabs sound gen),elevenlabs-sound-generation
34,41.300,42.800,sfx,soft-tone.mp3,Soft tone at emblem,project-asset
35,41.600,44.100,sfx,warm-chord.mp3,"warm low orchestral chord bloom, strings, sustained, golden tone, 2s" (ElevenLabs sound gen),elevenlabs-sound-generation
36,42.000,50.000,sfx,airy-shimmer.mp3,"ethereal airy shimmer pad, soft magical texture, dreamlike, 8s" (ElevenLabs sound gen),elevenlabs-sound-generation
37,42.667,43.667,sfx,received-chime.mp3,Chime on shimmer pass,project-asset
38,46.000,46.667,sfx,received-chime.mp3,Chime cascade Act 2 start 1,project-asset
39,46.333,47.000,sfx,received-chime.mp3,Chime cascade Act 2 start 2,project-asset
40,46.667,47.333,sfx,received-chime.mp3,Chime cascade Act 2 start 3,project-asset
41,47.000,47.667,sfx,received-chime.mp3,Chime cascade Act 2 start 4,project-asset
42,52.000,52.667,sfx,ui-tick.mp3,UI tick 1,project-asset
43,52.667,53.333,sfx,ui-tick.mp3,UI tick 2,project-asset
44,53.333,54.000,sfx,ui-tick.mp3,UI tick 3,project-asset
45,66.000,68.000,sfx,confirm.mp3,Confirm SFX,project-asset
46,67.000,67.667,sfx,received-chime.mp3,Received chime 1,project-asset
47,67.667,68.333,sfx,received-chime.mp3,Received chime 2,project-asset
48,68.333,69.000,sfx,received-chime.mp3,Received chime 3,project-asset
49,69.000,69.667,sfx,received-chime.mp3,Received chime 4,project-asset
50,70.000,72.000,sfx,whoosh.mp3,Whoosh transition,project-asset
CUEEOF

echo "Cue sheet: $CUE"

echo ""
echo "=== Writing asset manifest ==="
cat > "$STEMS/asset-manifest.json" << 'MANEOF'
{
  "version": "v4c",
  "generated": "2026-11-19",
  "elevenlabs_assets": {
    "arabic_voice": {
      "voice_id": "WcswLmU3iGeMrhxfWXKN",
      "voice_name": "Yousuf - Cinematic Emirati Narrator",
      "model": "eleven_v3",
      "language": "Arabic (Gulf Emirati)",
      "lines": [
        {
          "file": "lar1.mp3",
          "text": "انسياب",
          "text_with_direction": "[softly, reverently] انسياب",
          "duration_s": 2.19,
          "note": "NEEDS NATIVE-SPEAKER CHECK"
        },
        {
          "file": "lar2.mp3",
          "text": "المدينة تشوف اللي جاي",
          "text_with_direction": "[softly, with wonder] المدينة تشوف اللي جاي",
          "translation": "The city sees what's coming",
          "duration_s": 2.77,
          "note": "NEEDS NATIVE-SPEAKER CHECK"
        }
      ]
    },
    "sound_generation": [
      {
        "file": "reverse-swell.mp3",
        "prompt": "cinematic orchestral reverse swell, rising from deep silence to a warm crescendo, 2 seconds",
        "duration_seconds": 2.0,
        "prompt_influence": 0.5
      },
      {
        "file": "airy-shimmer.mp3",
        "prompt": "ethereal airy shimmer pad, soft magical texture, dreamlike soundscape, gentle, 8 seconds",
        "duration_seconds": 8.0,
        "prompt_influence": 0.4
      },
      {
        "file": "dawn-ambience.mp3",
        "prompt": "peaceful warm morning ambience, distant soft city sounds, gentle birds chirping, golden dawn, 15 seconds",
        "duration_seconds": 15.0,
        "prompt_influence": 0.4
      },
      {
        "file": "warm-chord.mp3",
        "prompt": "warm low orchestral chord bloom, strings, sustained, golden tone, cinematic, 2 seconds",
        "duration_seconds": 2.0,
        "prompt_influence": 0.5
      }
    ]
  }
}
MANEOF

echo "Asset manifest: $STEMS/asset-manifest.json"
echo ""
echo "=== Stems complete: $STEMS ==="
ls -lh "$STEMS"
