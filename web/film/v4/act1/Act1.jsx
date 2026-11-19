// Act1.jsx — 0-38s: assembles all Act 1 scenes
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SCENE, s } from '../beat.js';
import { OpeningShot } from './scenes/OpeningShot.jsx';
import { Highway } from './scenes/Highway.jsx';
import { Vignettes } from './scenes/Vignettes.jsx';
import { MapChaos } from './scenes/MapChaos.jsx';
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
  // Control room: 26-38s
  return <ControlRoom frame={frame} localFrame={frame - CTRL_ROOM} />;
}
