// Act2.jsx (v4e) — 48.7-87s
// v4e: all five scenes use word-level Caption; new scene boundaries from v4e beat.js
// CALL_CHAIN now 65.3-76.1s, CHART 76.1-83.4s, RESOLUTION 83.4-87s
import React from 'react';
import { SCENE } from '../beat.js';
import { Question }    from './scenes/Question.jsx';
import { MapPrecise }  from './scenes/MapPrecise.jsx';
import { CallChain }   from './scenes/CallChain.jsx';
import { Chart }       from './scenes/Chart.jsx';
import { Resolution }  from './scenes/Resolution.jsx';

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
