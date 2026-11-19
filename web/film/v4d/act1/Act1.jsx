// Act1.jsx (v4c) — 0-38s: assembles all Act 1 scenes
// Changes from v4b: imports ControlRoom from v4c (BottomCreditTag fix)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SCENE } from '../beat.js';
import { OpeningShot } from '../../v4/act1/scenes/OpeningShot.jsx';
import { Highway } from '../../v4/act1/scenes/Highway.jsx';
import { Vignettes } from '../../v4/act1/scenes/Vignettes.jsx';
import { MapChaos } from '../../v4/act1/scenes/MapChaos.jsx';
import { ControlRoom } from './scenes/ControlRoom.jsx';

export function Act1({ frame }) {
  const { HIGHWAY, VIGNETTES, MAP_CHAOS, CTRL_ROOM } = SCENE;

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
  return <ControlRoom frame={frame} localFrame={frame - CTRL_ROOM} />;
}
