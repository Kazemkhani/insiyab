# The opening films

The 38-second screen walkthrough remains available with `render.sh`. The 60-second comic cut uses the same live Three.js scene renderer and bundled map, followed by a QR code into the interactive product. It is an opening to the demonstration, not a replacement for it.

```sh
node web/build.mjs --bundle fixtures --out /tmp/insiyab-site
bash web/film/render-comic.sh /tmp/insiyab-site ~/work/insiyab-run/film/comic ~/work/insiyab-run/film/audio
python3 web/film/verify-comic.py /tmp/insiyab-site ~/work/insiyab-run/film/comic ~/work/insiyab-run/film/audio
```

`prepare-comic.mjs` reads the built bundle and the supplied `cues.json`, normalized soundtrack. It refuses a worker story whose capacity/load differs from the selected exchange. It makes no paid requests. `capture-comic.py` records six local scenes with external networking off. `comic.jsx` builds 1,800 frames at 1920×1080, 30 fps. Generated media stays outside git. The verifier checks the encoded streams, decoded audio headroom and silent transition, saves thirteen frames to open, and deliberately supplies a mismatched story to check rejection.

The supplied sound belongs to lane 1's `tools/make_film_sound.py` and `docs/FILM-SCRIPT.md`. This cut uses all thirteen corrected recordings and the normalized soundtrack delivered at 06:31 on 17 November. The narration distinguishes separate trips, replay and forecast boardings. Preparation refuses the four superseded claims. Captions follow the supplied cue times. The export uses 0.7 playback gain to leave headroom after AAC encoding. Audio headroom is checked mechanically. Pronunciation, balance and the dramatic effect still need a human listen.

Every transport number comes from the bundle. Trip loads are separately recorded peaks. The exchange remains simulated, with empty-running distance and unchecked access/duties stated. The forecast example reveals its recorded value even when it falls outside the supplied range. The day is not presented as validation on another day. The points offer is voluntary and does not reserve a seat. Every fixture frame retains the stand-in banner, and every map frame credits the archived public network and OpenStreetMap.

The interactive guide is the default site entry. The film is a separate local MP4; it does not autoplay over the product or add a runtime network dependency.
