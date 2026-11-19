// Act1.jsx (v4e) — 0-38s: assembles all Act 1 scenes
// v4e: all five scenes use word-level Caption from v4e components
import React from 'react';
import { SCENE } from '../beat.js';
import { OpeningShot } from './scenes/OpeningShot.jsx';
import { Highway }     from './scenes/Highway.jsx';
import { Vignettes }   from './scenes/Vignettes.jsx';
import { MapChaos }    from './scenes/MapChaos.jsx';
import { ControlRoom } from './scenes/ControlRoom.jsx';

export function Act1({ frame }) {
  const { HIGHWAY, VIGNETTES, MAP_CHAOS, CTRL_ROOM } = SCENE;

  if (frame < HIGHWAY)    return <OpeningShot frame={frame} />;
  if (frame < VIGNETTES)  return <Highway    frame={frame} localFrame={frame - HIGHWAY} />;
  if (frame < MAP_CHAOS)  return <Vignettes  frame={frame} localFrame={frame - VIGNETTES} />;
  if (frame < CTRL_ROOM)  return <MapChaos   frame={frame} localFrame={frame - MAP_CHAOS} />;
  return                         <ControlRoom frame={frame} localFrame={frame - CTRL_ROOM} />;
}
