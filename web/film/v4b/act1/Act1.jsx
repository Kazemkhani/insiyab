// Act1.jsx (v4b) — 0-38s: assembles all Act 1 scenes
// Only change from v4: imports ControlRoom from v4b (non-specific alerts)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SCENE, s } from '../../v4/beat.js';
import { OpeningShot } from '../../v4/act1/scenes/OpeningShot.jsx';
import { Highway } from '../../v4/act1/scenes/Highway.jsx';
import { Vignettes } from '../../v4/act1/scenes/Vignettes.jsx';
import { MapChaos } from '../../v4/act1/scenes/MapChaos.jsx';
// v4b ControlRoom: AlertWall uses non-specific text, PhoneRingIcons uses SVG
import { ControlRoom } from './scenes/ControlRoom.jsx';

export function Act1({ frame }) {
  const { OPENING, HIGHWAY, VIGNETTES, MAP_CHAOS, CTRL_ROOM, ACT1_END } = SCENE;

  if (frame < HIGHWAY) {
    return <OpeningShot frame={frame} />;
  }
  if (frame < VIGNETTES) {
    return <Highway frame={frame} localFrame={frame - HIGHWAY} />;
  }
  if (frame < MAP_CHAOS) {
    return <Vignettes frame={frame} localFrame={frame - VIGNETTES} />;
  }
  if (frame < CTRL_ROOM) {
    return <MapChaos frame={frame} localFrame={frame - MAP_CHAOS} />;
  }
  // Control room: 26-38s — v4b version
  return <ControlRoom frame={frame} localFrame={frame - CTRL_ROOM} />;
}
