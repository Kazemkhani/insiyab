// Act2.jsx (v4d) — 48.6–87s: assembles all Act 2 scenes
// KEY CHANGE: CallChain and Chart now import from LOCAL scenes (redesigned)
// All other scenes still re-use v4b (unchanged, their localFrame logic is relative)
import React from 'react';
import { SCENE } from '../beat.js';
import { Question }    from '../../v4b/act2/scenes/Question.jsx';
import { MapPrecise }  from '../../v4b/act2/scenes/MapPrecise.jsx';
import { CallChain }   from './scenes/CallChain.jsx';   // redesigned in v4d
import { Chart }       from './scenes/Chart.jsx';        // redesigned in v4d
import { Resolution }  from '../../v4b/act2/scenes/Resolution.jsx';

export function Act2({ frame }) {
  const { QUESTION, MAP_PRECISE, CALL_CHAIN, CHART, RESOLUTION } = SCENE;

  if (frame < MAP_PRECISE) {
    return <Question   frame={frame} localFrame={frame - QUESTION} />;
  }
  if (frame < CALL_CHAIN) {
    return <MapPrecise frame={frame} localFrame={frame - MAP_PRECISE} />;
  }
  if (frame < CHART) {
    return <CallChain  frame={frame} localFrame={frame - CALL_CHAIN} />;
  }
  if (frame < RESOLUTION) {
    return <Chart      frame={frame} localFrame={frame - CHART} />;
  }
  return <Resolution   frame={frame} localFrame={frame - RESOLUTION} />;
}
