// Act2.jsx (v4c) — 46-84s: assembles all Act 2 scenes
// Key change: imports SCENE from v4c/beat.js (Act 2 starts at s(46) not s(42))
// Individual scenes reused from v4b (their local frame logic is relative,
// internal s() calls are unaffected by the global +4s shift)
import React from 'react';
import { SCENE } from '../beat.js';
import { Question }    from '../../v4b/act2/scenes/Question.jsx';
import { MapPrecise }  from '../../v4b/act2/scenes/MapPrecise.jsx';
import { CallChain }   from '../../v4b/act2/scenes/CallChain.jsx';
import { Chart }       from '../../v4b/act2/scenes/Chart.jsx';
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
